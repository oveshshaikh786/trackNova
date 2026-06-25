package org.example.services;

import org.example.entities.Waypoint;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * WindowAI — pre-generated landmark waypoints for every seeded route.
 *
 * Data pipeline (how this would work at scale):
 *   1. Download Amtrak GTFS route shapes (GeoJSON lines) — free
 *   2. Query OpenStreetMap Overpass API for landmarks within 2 km of each line
 *   3. Call Wikipedia API for descriptions
 *   4. Run LLM once offline to generate narration tone
 *   5. Store result as this static dataset (or in DB)
 *
 * During journey: positionPercent is derived from elapsed time / total duration.
 * No live LLM cost — all narration is pre-generated.
 */
@Service
public class WaypointService {

    /** Total journey minutes per train (for elapsed-time → position calculation). */
    private static final Map<String, Integer> JOURNEY_MINUTES = Map.of(
        "AMT-101", 245,   // ~4h 05m  New York → Washington DC
        "AMT-102", 290,   // ~4h 50m  Boston → Washington DC
        "AMT-103", 2640,  // ~44h     Chicago → San Francisco
        "AMT-104", 2100,  // ~35h     Chicago → Seattle
        "AMT-105", 1185   // ~19h 45m New York → Miami
    );

    private static final Map<String, List<Waypoint>> WAYPOINTS = new HashMap<>();

    static {
        // ── AMT-101: Northeast Regional ──────────────────────────────
        WAYPOINTS.put("AMT-101", List.of(
            new Waypoint("AMT-101",  8, "Hudson River Meadowlands",
                "The Manhattan skyline fades behind you as you cross the Hudson watershed. Those iconic towers you see receding were built on solid bedrock — the same granite that makes New York's skyscrapers possible.",
                "BOTH", "🌆"),
            new Waypoint("AMT-101", 18, "Newark, New Jersey",
                "Passing through Newark, New Jersey's largest city, founded in 1666 by Puritan settlers. Newark Liberty Airport sits 2 miles to your right — look for landing planes on approach.",
                "RIGHT", "✈️"),
            new Waypoint("AMT-101", 32, "Delaware River Crossing",
                "You're crossing the Delaware River — the boundary between New Jersey and Pennsylvania. George Washington famously crossed this exact stretch on Christmas night 1776 for his surprise attack on Trenton, turning the tide of the Revolution.",
                "BOTH", "🌊"),
            new Waypoint("AMT-101", 45, "Philadelphia Skyline Approach",
                "The Philadelphia skyline rises to your left — the City of Brotherly Love. The Independence Hall where the Declaration of Independence was signed in 1776 sits just a mile from the station. Look for the ornate City Hall clock tower at center.",
                "LEFT", "🏛️"),
            new Waypoint("AMT-101", 62, "Wilmington, Delaware",
                "Wilmington, America's corporate capital. Over half of all Fortune 500 companies are legally incorporated in Delaware — including Google, Amazon, and Apple — drawn by its business-friendly laws.",
                "BOTH", "🏢"),
            new Waypoint("AMT-101", 75, "Baltimore Harbor",
                "Baltimore's Inner Harbor glimmers to your left. This city inspired the Star-Spangled Banner: Francis Scott Key wrote it watching the British bombardment of Fort McHenry in 1814. The fort held, and so did the nation.",
                "LEFT", "⚓"),
            new Waypoint("AMT-101", 88, "The Pentagon",
                "The Pentagon is exactly 1 mile to your right — the world's largest office building by floor area. Completed in just 16 months during WWII, it houses 26,000 employees across 17.5 miles of corridors.",
                "RIGHT", "🏛️"),
            new Waypoint("AMT-101", 97, "US Capitol & Union Station",
                "Washington DC is arriving. The Capitol dome to your left was completed during the Civil War — Lincoln insisted construction continue as a symbol that the Union would stand. Welcome to the seat of American power.",
                "LEFT", "🏛️")
        ));

        // ── AMT-102: Acela Express ────────────────────────────────────
        WAYPOINTS.put("AMT-102", List.of(
            new Waypoint("AMT-102",  5, "Boston Back Bay",
                "Leaving Boston's Back Bay neighborhood — MIT is 2 miles north, Harvard 4 miles northwest. This is the most educated square mile in America, home to more Nobel laureates per capita than any other city.",
                "BOTH", "🎓"),
            new Waypoint("AMT-102", 14, "Providence, Rhode Island",
                "Providence — America's second-oldest city, founded in 1636 by Roger Williams after he was banished from Massachusetts for his radical belief in religious freedom. The statehouse dome is larger than the US Capitol.",
                "RIGHT", "🏛️"),
            new Waypoint("AMT-102", 24, "New Haven & Yale University",
                "New Haven, Connecticut — home to Yale University, founded in 1701. Look right for the Gothic stone towers of the campus. Yale has produced 5 US Presidents and 65 Nobel laureates.",
                "RIGHT", "🎓"),
            new Waypoint("AMT-102", 34, "Greenwich & Stamford, Connecticut",
                "The 'Wall Street of Connecticut' — more hedge funds per square mile here than anywhere outside Manhattan. Greenwich has the highest per-capita income of any US town.",
                "BOTH", "💼"),
            new Waypoint("AMT-102", 43, "New Rochelle — NYC Begins",
                "You're crossing into New York City's sphere. The Bronx border is moments away — from here the density increases dramatically. This is the Northeast Corridor's busiest stretch.",
                "BOTH", "🌆"),
            new Waypoint("AMT-102", 62, "Trenton — Delaware River",
                "The famous bridge sign reads 'Trenton Makes, The World Takes' — a reminder of New Jersey's industrial heritage. Crossing the Delaware River now.",
                "BOTH", "🌉"),
            new Waypoint("AMT-102", 75, "Wilmington, Delaware",
                "Wilmington again — corporate America's legal home. The DuPont Company, founded here in 1802, once made gunpowder for the US military and later invented Nylon, Teflon, and Kevlar.",
                "BOTH", "🏭"),
            new Waypoint("AMT-102", 90, "Baltimore — Fort McHenry",
                "Baltimore's waterfront to your left. The Key Bridge — rebuilt after the 2024 collapse — carries I-695 across the Patapsco River. Fort McHenry is 3 miles southeast.",
                "LEFT", "⚓"),
            new Waypoint("AMT-102", 97, "Arriving Washington DC",
                "Union Station ahead — one of the most beautiful Beaux-Arts buildings in America. The Capitol dome is 800 meters straight ahead. You've traveled the most important rail corridor in the United States.",
                "BOTH", "🏛️")
        ));

        // ── AMT-103: California Zephyr ────────────────────────────────
        WAYPOINTS.put("AMT-103", List.of(
            new Waypoint("AMT-103",  3, "Chicago's Vanishing Skyline",
                "Chicago's architectural skyline fades behind you. The Willis Tower (formerly Sears Tower) held the world's tallest building record for 25 years. Chicago invented the skyscraper — every glass tower you've ever seen traces its lineage to this city.",
                "BOTH", "🌆"),
            new Waypoint("AMT-103",  8, "Illinois Prairie",
                "Entering Illinois prairie country — this perfect flatness was carved by glaciers 12,000 years ago. The black soil here is among the world's most fertile, producing 20% of America's corn.",
                "BOTH", "🌾"),
            new Waypoint("AMT-103", 16, "Mississippi River Crossing",
                "LOOK BOTH DIRECTIONS — you're crossing the Mississippi River! At 2,340 miles long, it drains water from 31 US states. Mark Twain grew up on these banks and immortalized this river in Huckleberry Finn.",
                "BOTH", "🌊"),
            new Waypoint("AMT-103", 26, "Nebraska Cornfields",
                "Nebraska: the Cornhusker State. This state produces enough corn in a single year to circle the Earth 320 times in cobs laid end to end. The Platte River — visible to your south — guided thousands of westward pioneers on the Oregon Trail.",
                "BOTH", "🌽"),
            new Waypoint("AMT-103", 36, "Rocky Mountains First Glimpse",
                "The Front Range of the Rocky Mountains is rising on the horizon — those white-capped peaks are over 14,000 feet high. You're 5,000 feet above sea level already, and you haven't started climbing yet.",
                "WEST", "⛰️"),
            new Waypoint("AMT-103", 40, "Denver — Mile High City",
                "Denver: exactly one mile above sea level. The thin air here actually benefits the city's sports teams — baseballs fly farther, kicks sail wider. Denver has 300 days of sunshine per year — more than Miami.",
                "BOTH", "🏔️"),
            new Waypoint("AMT-103", 48, "Moffat Tunnel — 9,239 feet",
                "Entering the 6.2-mile Moffat Tunnel — at 9,239 feet, the highest railroad tunnel in the continental US. You're burrowing through the Continental Divide. On the other side, every drop of water flows toward the Pacific, not the Atlantic.",
                "BOTH", "🚇"),
            new Waypoint("AMT-103", 53, "Glenwood Canyon",
                "LOOK BOTH SIDES — welcome to the most spectacular 12 miles of railroading in America. Glenwood Canyon walls rise 2,000 feet on both sides. The Colorado River runs alongside, turquoise and powerful. This canyon took 300 million years to carve.",
                "BOTH", "🏞️"),
            new Waypoint("AMT-103", 62, "Grand Junction, Colorado",
                "Colorado's wine country — the Book Cliffs to your north are one of the longest continuous cliff faces in North America, stretching 200 miles. Dinosaur fossils are regularly found in these red rock layers.",
                "BOTH", "🦕"),
            new Waypoint("AMT-103", 71, "Great Salt Lake",
                "The Great Salt Lake glimmers to your left on clear days — 8 times saltier than the ocean. The lake has shrunk over 50% in 70 years due to water diversion. At its peak, you could float effortlessly on the surface.",
                "LEFT", "🧂"),
            new Waypoint("AMT-103", 80, "Sierra Nevada Range",
                "Crossing the Sierra Nevada — the same mountain range that stranded the Donner Party in the winter of 1846. The survivors' story is one of the darkest chapters in American pioneer history.",
                "BOTH", "❄️"),
            new Waypoint("AMT-103", 89, "Sacramento Valley",
                "Sacramento Valley — gold was discovered at Sutter's Mill just 40 miles northeast in 1848, triggering the California Gold Rush. 300,000 people flooded California within 2 years, transforming a sleepy territory into a state.",
                "BOTH", "⛏️"),
            new Waypoint("AMT-103", 96, "San Francisco Bay",
                "The San Francisco Bay glitters ahead. You'll arrive at Emeryville — a shuttle bus connects to the Ferry Building in San Francisco. You've crossed a continent. 2,438 miles. Congratulations.",
                "BOTH", "🌉")
        ));

        // ── AMT-104: Empire Builder ───────────────────────────────────
        WAYPOINTS.put("AMT-104", List.of(
            new Waypoint("AMT-104",  5, "Milwaukee — Beer Capital",
                "Milwaukee, Wisconsin — America's historic beer capital. Miller and Pabst were born here. Lake Michigan stretches to your right, the 5th largest lake in the world, holding 20% of Earth's surface freshwater.",
                "RIGHT", "🍺"),
            new Waypoint("AMT-104", 15, "Wisconsin Dells",
                "The Wisconsin Dells nearby — dramatic sandstone formations carved by catastrophic glacial floods 15,000 years ago. These cliffs were eroded not over millions of years but in days by a flood of biblical scale.",
                "BOTH", "🪨"),
            new Waypoint("AMT-104", 23, "Mississippi River — Wisconsin/Minnesota Border",
                "Crossing the Mississippi again, this time marking the border between Wisconsin and Minnesota. Look downriver — 1,700 miles of water flows south from here to New Orleans.",
                "BOTH", "🌊"),
            new Waypoint("AMT-104", 31, "Twin Cities — Minneapolis",
                "Minneapolis and Saint Paul — the Twin Cities. The Mississippi River headwaters are just 150 miles north, at Lake Itasca, where the river is narrow enough to wade across.",
                "BOTH", "🏙️"),
            new Waypoint("AMT-104", 45, "Red River Valley — Fargo",
                "Dead flat. The Red River Valley is some of the most fertile farmland on Earth — formed by the ancient bed of glacial Lake Agassiz, which once covered an area larger than all the Great Lakes combined. The horizon is a perfect straight line in every direction.",
                "BOTH", "🌾"),
            new Waypoint("AMT-104", 55, "Center of North America — Minot, ND",
                "You are at the geographic center of North America. Rugby, North Dakota — 50 miles south — marks the exact spot. The nearest ocean is equidistant in every direction. You are as far from the sea as it is possible to be.",
                "BOTH", "🧭"),
            new Waypoint("AMT-104", 65, "Glacier National Park Boundary",
                "LOOK BOTH SIDES: You're skirting Glacier National Park — one of America's crown jewels. These peaks were sculpted by ice age glaciers. In 1850 the park had 150 glaciers; today just 25 remain due to climate warming.",
                "BOTH", "🏔️"),
            new Waypoint("AMT-104", 74, "Montana Open Range",
                "Open cattle range. Bison once roamed here in herds of 60 million — the largest animal migration in North American history. By the 1880s, commercial hunting had reduced them to fewer than 1,000. Conservation brought them back to 500,000 today.",
                "BOTH", "🦬"),
            new Waypoint("AMT-104", 83, "Columbia River Plateau, Spokane",
                "The Columbia River Plateau — 17 million years of volcanic lava flows created this landscape. The Columbia River itself carries more water than any other river in the western US, powering 14 federal dams.",
                "BOTH", "🌋"),
            new Waypoint("AMT-104", 92, "Cascade Mountains",
                "Entering the Cascade Range. Mount Rainier may be visible to your south — at 14,411 feet, it's the most glaciated peak in the contiguous United States. Its summit ice holds more glacial water than all other Cascades volcanoes combined.",
                "SOUTH", "🌋"),
            new Waypoint("AMT-104", 98, "Seattle — Puget Sound",
                "Seattle and Puget Sound ahead. The Pacific Ocean inlet stretches 100 miles south from here. Amazon, Microsoft, Boeing, Starbucks — some of the most influential companies in history were founded within 20 miles of this station.",
                "BOTH", "🌊")
        ));

        // ── AMT-105: Silver Star ──────────────────────────────────────
        WAYPOINTS.put("AMT-105", List.of(
            new Waypoint("AMT-105",  5, "New Jersey Meadowlands",
                "Crossing the Hudson watershed — the Manhattan skyline recedes. The Meadowlands to your left were once the largest tidal estuary on the East Coast. Today they host MetLife Stadium, home of the New York Giants and Jets.",
                "LEFT", "🏟️"),
            new Waypoint("AMT-105", 15, "Delaware River — Trenton",
                "Crossing the Delaware River at Trenton — George Washington's famous 1776 crossing was 3 miles north of here. The New Jersey State Capitol dome is visible to your right.",
                "BOTH", "🌊"),
            new Waypoint("AMT-105", 28, "Baltimore Inner Harbor",
                "Baltimore's waterfront. Edgar Allan Poe lived and died in this city — his grave is at Westminster Hall, 2 miles west. The National Aquarium, one of the largest in the world, is on the harbor.",
                "LEFT", "🦅"),
            new Waypoint("AMT-105", 35, "Washington DC — Capitol",
                "Washington DC visible. The Washington Monument obelisk — 555 feet tall — is the world's tallest stone structure. Congress passed a law limiting all future DC buildings to shorter than the Capitol dome.",
                "BOTH", "🏛️"),
            new Waypoint("AMT-105", 42, "Richmond, Virginia",
                "Richmond, Virginia — capital of the Confederacy during the Civil War. The James River to your left has been a commercial highway for 400 years. Richmond's tobacco warehouses once processed 25% of the world's tobacco supply.",
                "LEFT", "🌿"),
            new Waypoint("AMT-105", 50, "Petersburg, Virginia",
                "The Petersburg Siege site — 9.5 months of trench warfare from 1864 to 1865 that directly foreshadowed the trench warfare of World War I. The Union's breakthrough here forced Lee's retreat and ended the Civil War within weeks.",
                "BOTH", "⚔️"),
            new Waypoint("AMT-105", 60, "Raleigh, North Carolina",
                "Raleigh, part of the Research Triangle. Research Triangle Park — 10 miles west — is one of the world's largest research parks. IBM, Cisco, Red Hat, and 300 other companies employ 60,000 people here.",
                "WEST", "💻"),
            new Waypoint("AMT-105", 68, "Fort Liberty (Fort Bragg), Fayetteville",
                "Fort Liberty — formerly Fort Bragg — to your west. The largest military installation in the world by population: 57,000 active duty soldiers. Home of the 82nd Airborne Division and US Army Special Forces.",
                "WEST", "🎖️"),
            new Waypoint("AMT-105", 78, "South Carolina — Grand Strand Coast",
                "Entering South Carolina. Myrtle Beach and 60 miles of Atlantic coastline sit 50 miles to your east. The Grand Strand is one of the most popular beach destinations on the East Coast.",
                "EAST", "🏖️"),
            new Waypoint("AMT-105", 84, "Jacksonville, Florida — You've Arrived in the South",
                "Florida begins. Subtropical vegetation takes over — Spanish moss draping live oak trees marks the Deep South. The St. Johns River you're crossing is one of the few major US rivers that flows north.",
                "BOTH", "🌴"),
            new Waypoint("AMT-105", 89, "Daytona Beach Area",
                "You're 10 miles from Daytona Beach — the 'World's Most Famous Beach.' Racing began here on the hard-packed sand in 1902. Sir Malcolm Campbell set a world land speed record of 276 mph on this beach in 1935.",
                "EAST", "🏁"),
            new Waypoint("AMT-105", 93, "Orlando — Walt Disney World",
                "Walt Disney World is 20 miles to your west — the most visited tourist destination on Earth at 58 million visitors per year. Walt Disney bought this land in secret in 1965 for $200 per acre; today it's worth $500 million per acre.",
                "WEST", "🏰"),
            new Waypoint("AMT-105", 97, "Fort Lauderdale — Miami Approach",
                "Fort Lauderdale — the 'Venice of America,' with 165 miles of waterways winding through the city. The Miami skyline glitters ahead. You've traveled 1,393 miles from New York. This is as far south as you can go by Amtrak.",
                "BOTH", "🌴")
        ));
    }

    /** All waypoints for a given train, in order. */
    public List<Waypoint> getWaypoints(String trainId) {
        return WAYPOINTS.getOrDefault(trainId, List.of());
    }

    /** Total journey minutes for a train. */
    public int getJourneyMinutes(String trainId) {
        return JOURNEY_MINUTES.getOrDefault(trainId, 480);
    }

    /**
     * Given the departure time string (HH:mm) and the current time string (HH:mm),
     * compute which waypoints are current and upcoming.
     *
     * Returns a map: { current: Waypoint, upcoming: List<Waypoint>, positionPercent: int }
     */
    public Map<String, Object> getCurrentJourneyState(String trainId,
                                                       String departureTime,
                                                       String currentTime) {
        List<Waypoint> all = getWaypoints(trainId);
        int totalMinutes   = getJourneyMinutes(trainId);

        int elapsedMinutes = 0;
        try {
            LocalTime dep = LocalTime.parse(departureTime);
            LocalTime now = LocalTime.parse(currentTime);
            elapsedMinutes = (int) java.time.Duration.between(dep, now).toMinutes();
            if (elapsedMinutes < 0) elapsedMinutes += 1440; // next-day wrap
        } catch (Exception e) {
            elapsedMinutes = 0;
        }

        int positionPercent = Math.min(100, (int) ((elapsedMinutes * 100.0) / totalMinutes));

        // Find the last waypoint at or before current position (current)
        Waypoint current = null;
        for (Waypoint w : all) {
            if (w.getPositionPercent() <= positionPercent) {
                current = w;
            }
        }

        // Upcoming = up to 3 waypoints ahead of current position
        final int pos = positionPercent;
        List<Waypoint> upcoming = all.stream()
            .filter(w -> w.getPositionPercent() > pos)
            .limit(3)
            .collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("trainId",         trainId);
        result.put("positionPercent", positionPercent);
        result.put("elapsedMinutes",  elapsedMinutes);
        result.put("totalMinutes",    totalMinutes);
        result.put("current",         current);
        result.put("upcoming",        upcoming);
        return result;
    }
}

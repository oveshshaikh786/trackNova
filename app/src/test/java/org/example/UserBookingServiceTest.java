package org.example;

import org.example.entities.*;
import org.example.repositories.*;
import org.example.services.TrainService;
import org.example.services.UserBookingService;
import org.example.util.UserServiceUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserBookingServiceTest {

    @Mock UserRepository         userRepository;
    @Mock TicketRepository       ticketRepository;
    @Mock TrainService           trainService;
    @Mock AnnouncementRepository announcementRepository;
    @Mock PromoCodeRepository    promoCodeRepository;

    @InjectMocks UserBookingService service;

    private Train makeTrain(String id) {
        // 2-row × 3-col seat grid, all available
        List<List<Integer>> seats = new ArrayList<>();
        seats.add(new ArrayList<>(Arrays.asList(0, 0, 0)));
        seats.add(new ArrayList<>(Arrays.asList(0, 0, 0)));
        Train t = new Train(id, "AMT-101", "Test Express", 50, seats,
                Map.of("A", "08:00", "B", "12:00"), List.of("A", "B"));
        return t;
    }

    private User makeUser(String id, boolean suspended) {
        String hashed = UserServiceUtil.hashPassword("password123");
        User u = new User("testuser", "password123", hashed, id);
        u.setSuspended(suspended);
        return u;
    }

    // ── bookTrainSeatByRequest ─────────────────────────────────────────

    @Test
    void bookSeat_happyPath_returnsTrue() {
        Train train = makeTrain("T1");
        User user = makeUser("U1", false);

        when(trainService.getTrainById("T1")).thenReturn(Optional.of(train));
        when(userRepository.findById("U1")).thenReturn(Optional.of(user));

        boolean result = service.bookTrainSeatByRequest(
                "U1", "T1", 0, 0, "A", "B", "2026-07-01");

        assertTrue(result);
        assertEquals(1, train.getSeats().get(0).get(0)); // seat marked booked
        verify(trainService).saveTrain(train);
        verify(ticketRepository).save(any(Ticket.class));
    }

    @Test
    void bookSeat_alreadyBooked_returnsFalse() {
        Train train = makeTrain("T1");
        train.getSeats().get(0).set(0, 1); // seat already taken
        User user = makeUser("U1", false);

        when(trainService.getTrainById("T1")).thenReturn(Optional.of(train));

        boolean result = service.bookTrainSeatByRequest(
                "U1", "T1", 0, 0, "A", "B", "2026-07-01");

        assertFalse(result);
        verify(ticketRepository, never()).save(any());
    }

    @Test
    void bookSeat_invalidRowCol_returnsFalse() {
        Train train = makeTrain("T1");
        when(trainService.getTrainById("T1")).thenReturn(Optional.of(train));

        boolean result = service.bookTrainSeatByRequest(
                "U1", "T1", 99, 99, "A", "B", "2026-07-01");

        assertFalse(result);
        verify(ticketRepository, never()).save(any());
    }

    @Test
    void bookSeat_trainNotFound_returnsFalse() {
        when(trainService.getTrainById("MISSING")).thenReturn(Optional.empty());

        boolean result = service.bookTrainSeatByRequest(
                "U1", "MISSING", 0, 0, "A", "B", "2026-07-01");

        assertFalse(result);
    }

    // ── cancelBookingByUserId ──────────────────────────────────────────

    @Test
    void cancelBooking_ownerCanCancel_returnsTrue() {
        Train train = makeTrain("T1");
        train.getSeats().get(1).set(2, 1);
        User user = makeUser("U1", false);

        Ticket ticket = new Ticket("TK1", user, train, "A", "B", "2026-07-01", 1, 2);
        when(ticketRepository.findById("TK1")).thenReturn(Optional.of(ticket));
        when(trainService.getTrainById("T1")).thenReturn(Optional.of(train));

        boolean result = service.cancelBookingByUserId("TK1", "U1");

        assertTrue(result);
        assertEquals(0, train.getSeats().get(1).get(2)); // seat freed
        verify(ticketRepository).delete(ticket);
    }

    @Test
    void cancelBooking_wrongUser_returnsFalse() {
        Train train = makeTrain("T1");
        User owner = makeUser("U1", false);
        Ticket ticket = new Ticket("TK1", owner, train, "A", "B", "2026-07-01", 0, 0);

        when(ticketRepository.findById("TK1")).thenReturn(Optional.of(ticket));

        boolean result = service.cancelBookingByUserId("TK1", "U_OTHER");

        assertFalse(result);
        verify(ticketRepository, never()).delete(any());
    }

    // ── adminCancelBooking ─────────────────────────────────────────────

    @Test
    void adminCancelBooking_noOwnershipCheck_returnsTrue() {
        Train train = makeTrain("T1");
        train.getSeats().get(0).set(1, 1);
        User anyUser = makeUser("U_RANDOM", false);
        Ticket ticket = new Ticket("TK2", anyUser, train, "A", "B", "2026-07-01", 0, 1);

        when(ticketRepository.findById("TK2")).thenReturn(Optional.of(ticket));
        when(trainService.getTrainById("T1")).thenReturn(Optional.of(train));

        boolean result = service.adminCancelBooking("TK2");

        assertTrue(result);
        assertEquals(0, train.getSeats().get(0).get(1)); // seat freed
        verify(ticketRepository).delete(ticket);
    }

    @Test
    void adminCancelBooking_ticketNotFound_returnsFalse() {
        when(ticketRepository.findById("NOPE")).thenReturn(Optional.empty());

        boolean result = service.adminCancelBooking("NOPE");

        assertFalse(result);
    }

    // ── authenticateWithReason ────────────────────────────────────────

    @Test
    void authenticate_validCredentials_returnsOK() {
        User user = makeUser("U1", false);
        when(userRepository.findByName("testuser")).thenReturn(Optional.of(user));

        String result = service.authenticateWithReason("testuser", "password123");

        assertEquals("OK", result);
        verify(userRepository).save(user); // lastLogin updated
    }

    @Test
    void authenticate_wrongPassword_returnsInvalid() {
        User user = makeUser("U1", false);
        when(userRepository.findByName("testuser")).thenReturn(Optional.of(user));

        String result = service.authenticateWithReason("testuser", "wrongpass");

        assertEquals("INVALID", result);
    }

    @Test
    void authenticate_suspendedUser_returnsSuspended() {
        User user = makeUser("U1", true); // suspended = true
        when(userRepository.findByName("testuser")).thenReturn(Optional.of(user));

        String result = service.authenticateWithReason("testuser", "password123");

        assertEquals("SUSPENDED", result);
        verify(userRepository, never()).save(any()); // lastLogin NOT updated
    }

    @Test
    void authenticate_unknownUser_returnsInvalid() {
        when(userRepository.findByName("ghost")).thenReturn(Optional.empty());

        String result = service.authenticateWithReason("ghost", "pass");

        assertEquals("INVALID", result);
    }
}

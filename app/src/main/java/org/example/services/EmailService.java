package org.example.services;

import org.example.entities.Ticket;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final boolean enabled;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
        // Disable gracefully if no mail config is set
        String host = System.getenv("MAIL_HOST");
        this.enabled = (host != null && !host.isBlank());
    }

    public void sendBookingConfirmation(String toEmail, Ticket ticket) {
        if (!enabled || toEmail == null || toEmail.isBlank()) return;
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper h = new MimeMessageHelper(msg, false, "UTF-8");
            h.setTo(toEmail);
            h.setSubject("TrackNova — Booking Confirmed #" + ticket.getTicketId().substring(0, 8).toUpperCase());
            h.setText(buildConfirmationHtml(ticket), true);
            mailSender.send(msg);
        } catch (Exception e) {
            System.err.println("[EmailService] Failed to send confirmation: " + e.getMessage());
        }
    }

    public void sendCancellationNotice(String toEmail, String ticketId, String trainName,
                                       String source, String destination, String date) {
        if (!enabled || toEmail == null || toEmail.isBlank()) return;
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper h = new MimeMessageHelper(msg, false, "UTF-8");
            h.setTo(toEmail);
            h.setSubject("TrackNova — Booking Cancelled #" + ticketId.substring(0, 8).toUpperCase());
            h.setText(buildCancellationHtml(ticketId, trainName, source, destination, date), true);
            mailSender.send(msg);
        } catch (Exception e) {
            System.err.println("[EmailService] Failed to send cancellation: " + e.getMessage());
        }
    }

    public void sendWaitlistNotification(String toEmail, String trainName, String date) {
        if (!enabled || toEmail == null || toEmail.isBlank()) return;
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper h = new MimeMessageHelper(msg, false, "UTF-8");
            h.setTo(toEmail);
            h.setSubject("TrackNova — You're on the Waitlist!");
            h.setText(buildWaitlistHtml(trainName, date), true);
            mailSender.send(msg);
        } catch (Exception e) {
            System.err.println("[EmailService] Failed to send waitlist notice: " + e.getMessage());
        }
    }

    private String buildConfirmationHtml(Ticket ticket) {
        String train = ticket.getTrain() != null ? ticket.getTrain().getName() : "N/A";
        String fareClass = ticket.getFareClass() != null ? ticket.getFareClass() : "ECONOMY";
        return """
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#07090f;color:#e2e8f0;padding:32px;border-radius:16px">
              <h1 style="color:#6366f1;margin:0 0 8px">🚆 Booking Confirmed</h1>
              <p style="color:#94a3b8;margin:0 0 24px">Your TrackNova ticket is ready.</p>
              <div style="background:#0d1220;border-radius:12px;padding:20px;margin-bottom:16px">
                <p style="margin:4px 0"><b style="color:#f59e0b">Train:</b> %s</p>
                <p style="margin:4px 0"><b style="color:#f59e0b">Route:</b> %s → %s</p>
                <p style="margin:4px 0"><b style="color:#f59e0b">Date:</b> %s</p>
                <p style="margin:4px 0"><b style="color:#f59e0b">Seat:</b> Row %d · Seat %d</p>
                <p style="margin:4px 0"><b style="color:#f59e0b">Class:</b> %s</p>
                <p style="margin:4px 0"><b style="color:#f59e0b">Fare:</b> $%d</p>
                <p style="margin:4px 0"><b style="color:#94a3b8">Booking ID:</b> %s</p>
              </div>
              <p style="color:#64748b;font-size:12px">TrackNova — Your intelligent rail journey.</p>
            </div>
            """.formatted(
                train, ticket.getSource(), ticket.getDestination(),
                ticket.getDateOfTravel(), ticket.getSeatRow() + 1, ticket.getSeatCol() + 1,
                fareClass, ticket.getPricePaid(),
                ticket.getTicketId().substring(0, 8).toUpperCase());
    }

    private String buildCancellationHtml(String ticketId, String trainName,
                                          String source, String destination, String date) {
        return """
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#07090f;color:#e2e8f0;padding:32px;border-radius:16px">
              <h1 style="color:#f87171;margin:0 0 8px">Booking Cancelled</h1>
              <p style="color:#94a3b8;margin:0 0 24px">Your booking has been cancelled.</p>
              <div style="background:#0d1220;border-radius:12px;padding:20px">
                <p style="margin:4px 0"><b style="color:#f59e0b">Train:</b> %s</p>
                <p style="margin:4px 0"><b style="color:#f59e0b">Route:</b> %s → %s</p>
                <p style="margin:4px 0"><b style="color:#f59e0b">Date:</b> %s</p>
                <p style="margin:4px 0"><b style="color:#94a3b8">Booking ID:</b> %s</p>
              </div>
              <p style="color:#64748b;font-size:12px;margin-top:16px">If this was a mistake, please rebook on TrackNova.</p>
            </div>
            """.formatted(trainName, source, destination, date,
                          ticketId.substring(0, 8).toUpperCase());
    }

    private String buildWaitlistHtml(String trainName, String date) {
        return """
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#07090f;color:#e2e8f0;padding:32px;border-radius:16px">
              <h1 style="color:#f59e0b;margin:0 0 8px">⏳ Added to Waitlist</h1>
              <p style="color:#94a3b8">You've been added to the waitlist for <b>%s</b> on <b>%s</b>.</p>
              <p style="color:#94a3b8">You'll be automatically booked when a seat becomes available.</p>
            </div>
            """.formatted(trainName, date);
    }
}

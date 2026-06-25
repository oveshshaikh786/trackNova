package org.example.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Stripe-ready payment intent endpoint.
 *
 * HOW TO ENABLE REAL STRIPE PAYMENTS when you have API keys:
 * ─────────────────────────────────────────────────────────────
 * 1. Add to app/build.gradle:
 *      implementation 'com.stripe:stripe-java:24.3.0'
 *
 * 2. Set environment variable:
 *      STRIPE_SECRET_KEY=sk_live_xxx   (or sk_test_xxx for testing)
 *      REACT_APP_STRIPE_KEY=pk_live_xxx (in react-UI/.env)
 *
 * 3. Uncomment the Stripe block in createPaymentIntent() below.
 *
 * Until then, the endpoint returns { mock: true } and the frontend
 * skips Stripe and uses the built-in card form → bookSeats flow.
 * ─────────────────────────────────────────────────────────────
 */
@RestController
@RequestMapping("/api/payment")
public class PaymentController {

    /**
     * POST /api/payment/intent
     * Body: { amount: 123, currency: "usd" }
     *
     * Returns:
     *   { mock: true }                          — no Stripe key configured
     *   { mock: false, clientSecret: "pi_…" }  — real Stripe PaymentIntent
     */
    @PostMapping("/intent")
    public ResponseEntity<Map<String, Object>> createPaymentIntent(
            @RequestBody Map<String, Object> body) {

        int    amount   = body.get("amount")   != null ? ((Number) body.get("amount")).intValue() : 0;
        String currency = body.get("currency") instanceof String s ? s : "usd";

        String stripeKey = System.getenv("STRIPE_SECRET_KEY");

        if (stripeKey != null && !stripeKey.isBlank()) {
            // ── STRIPE REAL MODE ──────────────────────────────────────────
            // Uncomment this block after adding stripe-java to build.gradle:
            //
            // try {
            //     com.stripe.Stripe.apiKey = stripeKey;
            //     com.stripe.param.PaymentIntentCreateParams params =
            //         com.stripe.param.PaymentIntentCreateParams.builder()
            //             .setAmount((long) amount * 100L)   // Stripe uses cents
            //             .setCurrency(currency)
            //             .setAutomaticPaymentMethods(
            //                 com.stripe.param.PaymentIntentCreateParams.AutomaticPaymentMethods
            //                     .builder().setEnabled(true).build())
            //             .build();
            //     com.stripe.model.PaymentIntent intent =
            //         com.stripe.model.PaymentIntent.create(params);
            //     return ResponseEntity.ok(Map.of(
            //         "mock",         false,
            //         "clientSecret", intent.getClientSecret(),
            //         "amount",       amount,
            //         "currency",     currency
            //     ));
            // } catch (Exception e) {
            //     return ResponseEntity.internalServerError()
            //         .body(Map.of("error", e.getMessage()));
            // }
        }

        // ── MOCK MODE (no Stripe key) ─────────────────────────────────────
        // The frontend uses the built-in card form + books via /api/book.
        // Replace with the real block above once you have a Stripe key.
        return ResponseEntity.ok(Map.of(
            "mock",     true,
            "amount",   amount,
            "currency", currency
        ));
    }
}

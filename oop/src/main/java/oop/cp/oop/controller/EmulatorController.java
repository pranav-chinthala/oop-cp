package oop.cp.oop.controller;

import jakarta.validation.Valid;
import oop.cp.oop.dto.HttpEmulatorRequest;
import oop.cp.oop.dto.SocketEmulatorRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.Socket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/emulator")
public class EmulatorController {

    @PostMapping("/http")
    public ResponseEntity<?> runHttp(@Valid @RequestBody HttpEmulatorRequest payload) {
        try {
            HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create(payload.url()))
                    .timeout(Duration.ofSeconds(30));

            if (payload.headers() != null) {
                payload.headers().forEach(builder::header);
            }

            String method = payload.method().toUpperCase();
            if ("GET".equals(method) || "DELETE".equals(method)) {
                builder.method(method, HttpRequest.BodyPublishers.noBody());
            } else {
                builder.method(method, HttpRequest.BodyPublishers.ofString(payload.body() == null ? "" : payload.body()));
            }

            HttpResponse<String> response = client.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            Map<String, Object> result = new HashMap<>();
            result.put("status", response.statusCode());
            result.put("body", response.body());
            result.put("headers", response.headers().map());
            return ResponseEntity.ok(result);
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PostMapping("/socket")
    public ResponseEntity<?> runSocket(@Valid @RequestBody SocketEmulatorRequest payload) {
        try (Socket socket = new Socket(payload.host(), payload.port());
             OutputStreamWriter writer = new OutputStreamWriter(socket.getOutputStream());
             BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream()))) {

            socket.setSoTimeout(10_000);
            writer.write(payload.payload());
            writer.write("\n");
            writer.flush();

            String line = reader.readLine();
            return ResponseEntity.ok(Map.of(
                    "host", payload.host(),
                    "port", payload.port(),
                    "response", line == null ? "No response" : line
            ));
        } catch (IOException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }
}

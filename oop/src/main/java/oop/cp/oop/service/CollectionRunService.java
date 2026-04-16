package oop.cp.oop.service;

import oop.cp.oop.dto.CollectionRequestDto;
import oop.cp.oop.dto.CollectionRunItemResultDto;
import oop.cp.oop.dto.CollectionRunResponse;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class CollectionRunService {

    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    public CollectionRunResponse run(List<CollectionRequestDto> requests, boolean stopOnError) {
        List<CollectionRunItemResultDto> results = new ArrayList<>();
        int succeeded = 0;
        int failed = 0;
        long totalDurationMs = 0L;

        for (CollectionRequestDto request : requests) {
            long started = System.currentTimeMillis();
            try {
                HttpRequest.Builder builder = HttpRequest.newBuilder()
                        .uri(URI.create(request.url()))
                        .timeout(Duration.ofSeconds(30));

                if (request.headers() != null) {
                    request.headers().forEach(header -> {
                        if (header != null && header.key() != null && !header.key().isBlank()) {
                            builder.header(header.key(), header.value() == null ? "" : header.value());
                        }
                    });
                }

                String method = request.method() == null ? "GET" : request.method().toUpperCase(Locale.ROOT);
                if ("GET".equals(method) || "DELETE".equals(method) || "HEAD".equals(method)) {
                    builder.method(method, HttpRequest.BodyPublishers.noBody());
                } else {
                    builder.method(method, HttpRequest.BodyPublishers.ofString(request.body() == null ? "" : request.body()));
                }

                HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
                long durationMs = System.currentTimeMillis() - started;
                totalDurationMs += durationMs;
                String responseBody = response.body() == null ? "" : response.body();

                results.add(new CollectionRunItemResultDto(
                        request.id(),
                        request.name(),
                        method,
                        request.url(),
                        response.statusCode(),
                        responseBody,
                        response.headers().map(),
                        durationMs,
                        responseBody.length(),
                        null
                ));

                if (response.statusCode() >= 200 && response.statusCode() < 400) {
                    succeeded++;
                } else {
                    failed++;
                    if (stopOnError) {
                        break;
                    }
                }
            } catch (Exception ex) {
                long durationMs = System.currentTimeMillis() - started;
                totalDurationMs += durationMs;

                results.add(new CollectionRunItemResultDto(
                        request.id(),
                        request.name(),
                        request.method() == null ? "GET" : request.method().toUpperCase(Locale.ROOT),
                        request.url(),
                        null,
                        "",
                        new HashMap<>(),
                        durationMs,
                        0,
                        ex.getMessage() == null ? "Request failed" : ex.getMessage()
                ));

                failed++;
                if (stopOnError) {
                    break;
                }
            }
        }

        return new CollectionRunResponse(
                requests.size(),
                succeeded,
                failed,
                totalDurationMs,
                results
        );
    }
}

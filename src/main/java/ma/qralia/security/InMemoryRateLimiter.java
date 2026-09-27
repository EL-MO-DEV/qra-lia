package ma.qralia.security;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class InMemoryRateLimiter {

    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();
    private final int limit;

    public InMemoryRateLimiter(ma.qralia.config.AppProperties properties) {
        this.limit = properties.rateLimitPerMinute();
    }

    public void check(String ip) {
        long now = Instant.now().toEpochMilli();
        long windowStart = now - 60_000;
        Deque<Long> q = hits.computeIfAbsent(ip, k -> new ArrayDeque<>());
        synchronized (q) {
            while (!q.isEmpty() && q.peekFirst() < windowStart) {
                q.pollFirst();
            }
            if (q.size() >= limit) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "rate_limited");
            }
            q.addLast(now);
        }
    }
}

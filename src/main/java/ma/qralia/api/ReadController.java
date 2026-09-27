package ma.qralia.api;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import ma.qralia.domain.ReadRequest;
import ma.qralia.domain.ReadResult;
import ma.qralia.security.InMemoryRateLimiter;
import ma.qralia.service.DocumentReadService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class ReadController {

    private final DocumentReadService service;
    private final InMemoryRateLimiter rateLimiter;

    public ReadController(DocumentReadService service, InMemoryRateLimiter rateLimiter) {
        this.service = service;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping(value = "/read", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ReadResult read(
            @Valid @RequestBody ReadRequest body,
            @RequestHeader(value = "X-Mock-Scenario", required = false) String scenario,
            HttpServletRequest request
    ) {
        rateLimiter.check(clientIp(request));
        return service.read(body.imageBase64(), body.mimeType(), scenario);
    }

    static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr() == null ? "unknown" : request.getRemoteAddr();
    }
}

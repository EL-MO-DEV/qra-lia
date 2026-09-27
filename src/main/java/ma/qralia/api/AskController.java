package ma.qralia.api;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import ma.qralia.domain.AskRequest;
import ma.qralia.domain.AskResponse;
import ma.qralia.security.InMemoryRateLimiter;
import ma.qralia.service.AskService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class AskController {

    private final AskService askService;
    private final InMemoryRateLimiter rateLimiter;

    public AskController(AskService askService, InMemoryRateLimiter rateLimiter) {
        this.askService = askService;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping(value = "/ask", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public AskResponse ask(@Valid @RequestBody AskRequest body, HttpServletRequest request) {
        rateLimiter.check(ReadController.clientIp(request));
        return askService.ask(body.result(), body.question());
    }
}

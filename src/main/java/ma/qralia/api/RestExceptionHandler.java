package ma.qralia.api;

import ma.qralia.domain.ErrorResponse;
import ma.qralia.service.DocumentReadService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class RestExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(RestExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorResponse> invalid(MethodArgumentNotValidException ex) {
        log.warn("error type=invalid_input");
        return ResponseEntity.badRequest().body(ErrorResponse.of("invalid_input"));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ErrorResponse> unreadable(HttpMessageNotReadableException ex) {
        log.warn("error type=invalid_input");
        return ResponseEntity.badRequest().body(ErrorResponse.of("invalid_input"));
    }

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<ErrorResponse> status(ResponseStatusException ex) {
        HttpStatus http = HttpStatus.valueOf(ex.getStatusCode().value());
        String code = ex.getReason() == null ? "internal" : ex.getReason();
        log.warn("error type={}", code);
        return ResponseEntity.status(http).body(ErrorResponse.of(code));
    }

    @ExceptionHandler(DocumentReadService.AiUnavailableException.class)
    ResponseEntity<ErrorResponse> aiDown(DocumentReadService.AiUnavailableException ex) {
        log.warn("error type=ai_unavailable");
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(ErrorResponse.aiUnavailable());
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorResponse> other(Exception ex) {
        log.error("error type=internal class={}", ex.getClass().getSimpleName());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ErrorResponse.of("internal"));
    }
}

package ma.qralia.rules;

import ma.qralia.domain.Amount;
import ma.qralia.domain.ReadResult;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class RiskRulesEngineTest {

    private final RiskRulesEngine engine = new RiskRulesEngine();
    private final ZoneId casablanca = ZoneId.of("Africa/Casablanca");

    @Test
    void overdueDeadlineIsAlwaysHigh() {
        var ruled = engine.apply(base("low", yesterday().toString(), 0.9, false, "facture"), casablanca);
        assertThat(ruled.riskLevel()).isEqualTo("high");
        assertThat(ruled.riskReasons()).contains(RiskRulesEngine.REASON_DEADLINE_PASSED);
        assertThat(ruled.daysLeft()).isLessThan(0);
    }

    @Test
    void threeDaysOrLessIsAtLeastHigh() {
        var ruled = engine.apply(base("low", LocalDate.now(casablanca).plusDays(2).toString(), 0.9, false, "facture"), casablanca);
        assertThat(ruled.riskLevel()).isEqualTo("high");
        assertThat(ruled.riskReasons()).contains(RiskRulesEngine.REASON_FEW_DAYS);
    }

    @Test
    void fourToSevenDaysIsAtLeastMedium() {
        var ruled = engine.apply(base("low", LocalDate.now(casablanca).plusDays(5).toString(), 0.9, false, "facture"), casablanca);
        assertThat(ruled.riskLevel()).isEqualTo("medium");
        assertThat(ruled.riskReasons()).contains(RiskRulesEngine.REASON_SOON);
    }

    @Test
    void legalKeywordsForceHigh() {
        var ruled = engine.apply(base("low", LocalDate.now(casablanca).plusDays(20).toString(), 0.9, false, "mise en demeure huissier"), casablanca);
        assertThat(ruled.riskLevel()).isEqualTo("high");
        assertThat(ruled.riskReasons()).contains(RiskRulesEngine.REASON_LEGAL);
    }

    @Test
    void scamSignsForceHighAndFlag() {
        var ruled = engine.apply(base("low", LocalDate.now(casablanca).plusDays(20).toString(), 0.9, false, "أرسل CVV و bit.ly ربحت جائزة"), casablanca);
        assertThat(ruled.scamSuspected()).isTrue();
        assertThat(ruled.riskLevel()).isEqualTo("high");
        assertThat(ruled.riskReasons()).contains(RiskRulesEngine.REASON_SCAM);
    }

    @Test
    void lowConfidenceAddsVerifyReason() {
        var ruled = engine.apply(base("low", LocalDate.now(casablanca).plusDays(20).toString(), 0.4, false, "facture"), casablanca);
        assertThat(ruled.riskReasons()).contains(RiskRulesEngine.REASON_VERIFY);
        assertThat(ruled.riskLevel()).isEqualTo("low");
    }

    @Test
    void modelHighIsKeptWhenRulesAreLower() {
        var ruled = engine.apply(base("high", LocalDate.now(casablanca).plusDays(20).toString(), 0.9, false, "facture"), casablanca);
        assertThat(ruled.riskLevel()).isEqualTo("high");
    }

    private ReadResult base(String level, String deadline, double confidence, boolean scam, String text) {
        return new ReadResult(
                "ok",
                text,
                "ONEE",
                new Amount(100.0, "MAD"),
                deadline,
                null,
                "خلص",
                level,
                List.of(),
                scam,
                confidence,
                text,
                "gemini",
                1,
                List.of()
        );
    }

    private LocalDate yesterday() {
        return LocalDate.now(casablanca).minusDays(1);
    }
}

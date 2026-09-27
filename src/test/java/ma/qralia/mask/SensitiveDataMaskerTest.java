package ma.qralia.mask;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SensitiveDataMaskerTest {

    private final SensitiveDataMasker masker = new SensitiveDataMasker();

    @Test
    void masksMoroccanCinKeepingLast4() {
        assertThat(masker.maskText("CIN AB123456")).isEqualTo("CIN ••••3456");
        assertThat(masker.maskText("البطاقة BE98765")).isEqualTo("البطاقة ••••8765");
    }

    @Test
    void masksRib24Digits() {
        String rib = "007780000012345678901234";
        assertThat(masker.maskText("RIB " + rib)).isEqualTo("RIB ••••1234");
    }

    @Test
    void masksIban() {
        String iban = "MA64007780000012345678901234";
        assertThat(masker.maskText(iban)).isEqualTo("••••1234");
    }

    @Test
    void masksCardNumberWithSpaces() {
        assertThat(masker.maskText("card 4111 1111 1111 1111")).isEqualTo("card ••••1111");
        assertThat(masker.maskText("4012888888881881")).isEqualTo("••••1881");
    }

    @Test
    void leavesOrdinarySentenceUnchanged() {
        String sentence = "فاتورة ONEE ب 247.80 درهم قبل 15 أكتوبر. رقم العقد 998877.";
        assertThat(masker.maskText(sentence)).isEqualTo(sentence);
    }
}

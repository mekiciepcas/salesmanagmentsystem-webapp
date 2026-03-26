class UpsCalculator {
  constructor() {
    this.calculateButton = document.getElementById('calculateButton');
    this.resultsDiv = document.getElementById('results');

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.calculateButton.addEventListener('click', () => this.calculate());
  }

  calculate() {
    try {
      // Girdi değerlerini al
      const outputPower = parseFloat(
        document.getElementById('outputPower').value
      );
      const outputVoltage = parseFloat(
        document.getElementById('outputVoltage').value
      );
      const dcBusMin = parseFloat(document.getElementById('dcBusMin').value);
      const batteryChargeA = parseFloat(
        document.getElementById('batteryChargeA').value
      );
      const boostVoltage = parseFloat(
        document.getElementById('boostVoltage').value
      );
      const inputVoltage = parseFloat(
        document.getElementById('inputVoltage').value
      );
      const pf = parseFloat(document.getElementById('pf').value);
      const eff = parseFloat(document.getElementById('eff').value);

      // Hesaplamalar
      const outputCurrent = (outputPower * 1000) / outputVoltage;
      const dcBusMaxCurrent =
        (outputPower * pf * 1000) / (dcBusMin * eff) + batteryChargeA;
      const dcBusMinCurrent =
        (outputPower * pf * 1000) / (boostVoltage * eff) + batteryChargeA;
      const inputCurrent =
        (dcBusMin * dcBusMaxCurrent) / (inputVoltage * pf * eff * 1.732);
      const inputPower = (dcBusMin * dcBusMaxCurrent) / (pf * eff) / 1000;

      // Sonuçları göster
      this.resultsDiv.innerHTML = `
                <div class="result-item">
                    <label>Çıkış Akımı:</label>
                    <span>${outputCurrent.toFixed(2)} A</span>
                </div>
                <div class="result-item">
                    <label>DC Bus Max Akım:</label>
                    <span>${dcBusMaxCurrent.toFixed(2)} A</span>
                </div>
                <div class="result-item">
                    <label>DC Bus Min Akım:</label>
                    <span>${dcBusMinCurrent.toFixed(2)} A</span>
                </div>
                <div class="result-item">
                    <label>Giriş Akımı:</label>
                    <span>${inputCurrent.toFixed(2)} A</span>
                </div>
                <div class="result-item">
                    <label>Giriş Gücü:</label>
                    <span>${inputPower.toFixed(2)} kW</span>
                </div>
            `;
      this.resultsDiv.style.display = 'block';
    } catch (error) {
      console.error('Hesaplama hatası:', error);
      this.resultsDiv.innerHTML = `<div class="error">Hesaplama hatası oluştu: ${error.message}</div>`;
      this.resultsDiv.style.display = 'block';
    }
  }
}

// Sayfa yüklendiğinde hesaplayıcıyı başlat
window.addEventListener('DOMContentLoaded', () => {
  new UpsCalculator();
});

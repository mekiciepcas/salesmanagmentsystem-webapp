export class RectifierCalculator {
  constructor() {
    this.basePrice = 0;
    this.options = {};
  }

  calculatePrice(specifications) {
    // Rectifier fiyat hesaplama mantığı
    let totalPrice = this.basePrice;

    // Spesifikasyonlara göre hesaplama
    if (specifications) {
      // Akım değeri
      if (specifications.current) {
        totalPrice += specifications.current * 150; // Örnek çarpan
      }

      // Gerilim değeri
      if (specifications.voltage) {
        totalPrice += specifications.voltage * 50; // Örnek çarpan
      }

      // Diğer özellikler
      if (specifications.options) {
        Object.entries(specifications.options).forEach(([key, value]) => {
          if (value && this.options[key]) {
            totalPrice += this.options[key];
          }
        });
      }
    }

    return totalPrice;
  }
}

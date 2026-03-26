export class UPSCalculator {
  constructor() {
    this.basePrice = 0;
    this.options = {};
  }

  calculatePrice(specifications) {
    // UPS fiyat hesaplama mantığı
    let totalPrice = this.basePrice;

    // Spesifikasyonlara göre hesaplama
    if (specifications) {
      // Güç kapasitesi
      if (specifications.power) {
        totalPrice += specifications.power * 100; // Örnek çarpan
      }

      // Batarya süresi
      if (specifications.batteryTime) {
        totalPrice += specifications.batteryTime * 200; // Örnek çarpan
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

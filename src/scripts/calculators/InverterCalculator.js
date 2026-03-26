export class InverterCalculator {
  constructor() {
    this.basePrice = 0;
    this.options = {};
  }

  calculatePrice(specifications) {
    let totalPrice = this.basePrice;

    if (specifications) {
      // Güç kapasitesi
      if (specifications.power) {
        totalPrice += specifications.power * 100;
      }

      // Faz tipi
      if (specifications.phase) {
        totalPrice += specifications.phase === 'three' ? 300 : 100;
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

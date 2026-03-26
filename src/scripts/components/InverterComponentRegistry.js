export class InverterComponentRegistry {
  constructor() {
    this.components = new Map();
  }

  register(name, component) {
    this.components.set(name, component);
  }

  get(name) {
    return this.components.get(name);
  }

  getAll() {
    return Array.from(this.components.values());
  }
}

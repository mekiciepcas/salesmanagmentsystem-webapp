class CustomerService {
  constructor() {
    this.dbService = window.dbService;
  }

  async getAllCustomers() {
    try {
      const customers = await this.dbService.query(
        'SELECT * FROM customers ORDER BY created_at DESC'
      );
      return customers;
    } catch (error) {
      console.error('Müşteriler yüklenirken hata:', error);
      throw error;
    }
  }

  async getCustomerDetails(customerId) {
    try {
      const [customer] = await this.dbService.query(
        'SELECT * FROM customers WHERE id = ?',
        [customerId]
      );

      // Müşteriye ait teklifleri al
      const quotes = await this.dbService.query(
        'SELECT * FROM quotes WHERE customer_id = ? ORDER BY created_at DESC',
        [customerId]
      );

      // Müşteriye ait görüşmeleri al
      const meetings = await this.dbService.query(
        'SELECT * FROM meetings WHERE customer_id = ? ORDER BY meeting_date DESC',
        [customerId]
      );

      // Müşteriye ait notları al
      const notes = await this.dbService.query(
        'SELECT * FROM customer_notes WHERE customer_id = ? ORDER BY created_at DESC',
        [customerId]
      );

      return {
        ...customer,
        quotes,
        meetings,
        notes,
      };
    } catch (error) {
      console.error('Müşteri detayları yüklenirken hata:', error);
      throw error;
    }
  }

  async addCustomer(customerData) {
    try {
      const query = `
                INSERT INTO customers (
                    company_name,
                    category,
                    phone,
                    email,
                    address,
                    created_by,
                    status,
                    created_at,
                    updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `;

      const params = [
        customerData.companyName,
        customerData.category,
        customerData.phone,
        customerData.email,
        customerData.address,
        customerData.createdBy,
        customerData.status,
      ];

      return await this.dbService.query(query, params);
    } catch (error) {
      console.error('Müşteri eklenirken hata:', error);
      throw error;
    }
  }

  async updateCustomer(customerId, customerData) {
    try {
      await this.dbService.query(
        `UPDATE customers SET 
                    company_name = ?,
                    category = ?,
                    phone = ?,
                    email = ?,
                    address = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?`,
        [
          customerData.companyName,
          customerData.category,
          customerData.phone,
          customerData.email,
          customerData.address,
          customerId,
        ]
      );
      return true;
    } catch (error) {
      console.error('Müşteri güncellenirken hata:', error);
      throw error;
    }
  }

  async addCustomerNote(customerId, noteData) {
    try {
      const result = await this.dbService.query(
        `INSERT INTO customer_notes (
                    customer_id,
                    note_text,
                    created_by
                ) VALUES (?, ?, ?)`,
        [customerId, noteData.text, noteData.createdBy]
      );
      return result.insertId;
    } catch (error) {
      console.error('Not eklenirken hata:', error);
      throw error;
    }
  }

  async addCustomerMeeting(customerId, meetingData) {
    try {
      const result = await this.dbService.query(
        `INSERT INTO meetings (
                    customer_id,
                    meeting_date,
                    meeting_type,
                    description,
                    created_by
                ) VALUES (?, ?, ?, ?, ?)`,
        [
          customerId,
          meetingData.date,
          meetingData.type,
          meetingData.description,
          meetingData.createdBy,
        ]
      );
      return result.insertId;
    } catch (error) {
      console.error('Görüşme eklenirken hata:', error);
      throw error;
    }
  }

  async getCustomerStatistics() {
    try {
      const stats = await this.dbService.query(`
                SELECT 
                    COUNT(*) as total_customers,
                    SUM(CASE WHEN last_contact_date >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as active_customers,
                    AVG(quote_success_rate) as avg_success_rate
                FROM customers
            `);
      return stats[0];
    } catch (error) {
      console.error('İstatistikler yüklenirken hata:', error);
      throw error;
    }
  }

  async getCustomers() {
    try {
      const query = `
                SELECT 
                    c.*,
                    (SELECT COUNT(*) FROM quotes q WHERE q.customer_id = c.id) as total_quotes,
                    (SELECT MAX(created_at) FROM quotes q WHERE q.customer_id = c.id) as last_quote_date,
                    (SELECT total_amount FROM quotes q WHERE q.customer_id = c.id ORDER BY created_at DESC LIMIT 1) as last_quote_amount,
                    (SELECT MAX(meeting_date) FROM meetings m WHERE m.customer_id = c.id) as last_meeting_date
                FROM customers c 
                ORDER BY c.created_at DESC
            `;
      return await this.dbService.query(query);
    } catch (error) {
      console.error('Müşteriler alınırken hata:', error);
      throw error;
    }
  }
}

export default new CustomerService();

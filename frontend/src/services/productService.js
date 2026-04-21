import API from "./api";

/**
 * Fetch all products
 * GET /products/
 */
export const getAllProducts = (includeInactive = false) =>
  API.get("/products/", includeInactive ? { params: { include_inactive: true } } : {});

/**
 * Add a new product
 * POST /products/add
 */
export const addProduct = (data) => API.post("/products/add", data);

/**
 * Update/restock an existing product
 * PUT /products/update/{barcode}
 */
export const updateProduct = (barcode, data) =>
  API.put(`/products/update/${barcode}`, data);

/**
 * Delete a product entirely, or write off partial stock
 * DELETE /products/{barcode}
 */
export const deleteProduct = (barcode, data = null) => {
  if (data) {
    return API.delete(`/products/${barcode}`, { data });
  }
  return API.delete(`/products/${barcode}`);
};

/**
 * Sell a product
 * PUT /products/sell/{barcode}
 */
export const sellProduct = (barcode, data) =>
  API.put(`/products/sell/${barcode}`, data);

/**
 * Search products by name/description/alias
 * GET /products/search?q=query
 */
export const searchProducts = (q) =>
  API.get("/products/search", { params: { q } });

export default API;

/**
 * Mark a product as inactive (soft delete — hides from inventory, keeps transactions)
 * PUT /products/archive/{barcode}
 */
export const archiveProduct = (barcode) =>
  API.put(`/products/archive/${barcode}`);

/**
 * Reactivate a previously inactive product
 * PUT /products/reactivate/{barcode}
 */
export const reactivateProduct = (barcode) =>
  API.put(`/products/reactivate/${barcode}`);

/**
 * Send a voice command to the backend's advanced fuzzy engine.
 * GET /products/voice_command?command=...
 * The backend handles all fuzzy matching, word numbers, garbled STT, etc.
 */
export const voiceCommand = (command) =>
  API.post(`/products/voice_command`, null, { params: { command } });
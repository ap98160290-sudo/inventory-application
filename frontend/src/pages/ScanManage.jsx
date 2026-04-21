import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import Layout from "../layout/Layout";
import { addProduct, archiveProduct, deleteProduct, getAllProducts, sellProduct, updateProduct } from "../services/productService";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&display=swap');
  :root {
    --scan-bg: #08090f;
    --scan-panel: rgba(14, 16, 22, 0.94);
    --scan-soft: rgba(19, 21, 31, 0.94);
    --scan-border: rgba(148, 163, 184, 0.12);
    --scan-text: #edf3fb;
    --scan-muted: #64748b;
    --scan-lime: #d4ff27;
    --scan-red: #f43f5e;
    --scan-yellow: #f5c243;
    --scan-mono: 'JetBrains Mono', monospace;
    --scan-sans: 'DM Sans', sans-serif;
  }
  .scan-shell {
    min-height: 100%;
    background:
      linear-gradient(rgba(16, 21, 31, 0.54) 1px, transparent 1px),
      linear-gradient(90deg, rgba(16, 21, 31, 0.54) 1px, transparent 1px),
      var(--scan-bg);
    background-size: 60px 60px, 60px 60px, auto;
    font-family: var(--scan-sans);
    color: var(--scan-text);
  }
  .scan-grid {
    display: grid;
    grid-template-columns: minmax(320px, 360px) minmax(0, 1fr);
    gap: 18px;
    align-items: start;
  }
  .scan-card, .scan-main, .scan-summary-card {
    background: var(--scan-panel);
    border: 1px solid var(--scan-border);
    border-radius: 18px;
    box-shadow: 0 22px 50px rgba(0, 0, 0, 0.22);
  }
  .scan-card, .scan-main, .scan-summary-card { padding: 18px; }
  .scan-title, .scan-label {
    font-family: var(--scan-mono);
    text-transform: uppercase;
    letter-spacing: 0.18em;
  }
  .scan-title {
    margin-bottom: 18px;
    font-size: 11px;
    font-weight: 700;
    color: var(--scan-lime);
  }
  .scan-tabs, .scan-action-tabs {
    display: grid;
    gap: 8px;
  }
  .scan-tabs {
    grid-template-columns: repeat(3, 1fr);
    background: var(--scan-soft);
    border: 1px solid rgba(148, 163, 184, 0.08);
    border-radius: 14px;
    padding: 6px;
    margin-bottom: 18px;
  }
  .scan-action-tabs {
    grid-template-columns: repeat(4, 1fr);
    margin-bottom: 16px;
  }
  .scan-tab, .scan-action-tab, .scan-btn {
    border-radius: 10px;
    font-family: var(--scan-sans);
    font-size: 14px;
    font-weight: 700;
  }
  .scan-tab, .scan-action-tab {
    height: 40px;
    border: 1px solid var(--scan-border);
    background: rgba(23, 29, 39, 0.96);
    color: #8190a6;
    cursor: pointer;
  }
  .scan-tab.active, .scan-action-tab.active {
    background: #202835;
    color: var(--scan-lime);
  }
  .scan-label {
    display: block;
    margin-bottom: 8px;
    font-size: 10px;
    font-weight: 600;
    color: #738399;
  }
  .scan-input, .scan-select, .scan-textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--scan-border);
    border-radius: 12px;
    background: rgba(23, 29, 39, 0.96);
    color: var(--scan-text);
    font-family: var(--scan-sans);
    outline: none;
  }
  .scan-input, .scan-select {
    height: 42px;
    padding: 0 14px;
    font-size: 15px;
  }
  .scan-textarea {
    min-height: 92px;
    padding: 12px 14px;
    resize: vertical;
    font-size: 15px;
  }
  .scan-btn {
    height: 42px;
    border: 1px solid transparent;
    cursor: pointer;
  }
  .scan-btn-lime {
    width: 100%;
    margin-top: 16px;
    background: var(--scan-lime);
    color: #121826;
  }
  .scan-btn-danger {
    width: 100%;
    margin-top: 16px;
    background: var(--scan-red);
    color: #fff;
  }
  .scan-summary-top, .scan-summary-grid {
    display: grid;
  }
  .scan-summary-top {
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 12px;
    margin-bottom: 18px;
  }
  .scan-product-name {
    font-family: var(--scan-mono);
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--scan-lime);
  }
  .scan-badge {
    padding: 4px 10px;
    border-radius: 999px;
    background: rgba(157, 220, 47, 0.15);
    color: var(--scan-lime);
    font-family: var(--scan-mono);
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
  }
  .scan-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px 22px;
  }
  .scan-summary-label { color: var(--scan-muted); font-size: 13px; }
  .scan-summary-value { font-size: 20px; font-weight: 700; }
  .scan-message {
    margin-bottom: 14px;
    padding: 11px 14px;
    border-radius: 12px;
    font-size: 13px;
    line-height: 1.5;
  }
  .scan-message.error {
    background: rgba(244, 63, 94, 0.1);
    border: 1px solid rgba(244, 63, 94, 0.2);
    color: #ff93a8;
  }
  .scan-message.success {
    background: rgba(157, 220, 47, 0.1);
    border: 1px solid rgba(157, 220, 47, 0.18);
    color: #ddff7c;
  }
  .scan-message.warn {
    background: rgba(244, 63, 94, 0.12);
    border: 1px solid rgba(244, 63, 94, 0.3);
    color: #ff8aa1;
  }
  .scan-form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .scan-row-3 {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 220px 220px;
    gap: 10px;
    margin-top: 16px;
  }
  .scan-span-2 { grid-column: 1 / -1; }
  .scan-copy {
    margin-top: 8px;
    color: var(--scan-muted);
    font-size: 12px;
    line-height: 1.6;
  }
  .scan-dual-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 16px;
  }
  .scan-empty {
    min-height: 420px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: #7f8ea4;
    padding: 24px;
  }
  .scan-empty strong {
    display: block;
    margin-bottom: 8px;
    color: #d5deeb;
    font-size: 20px;
  }
  .scan-camera {
    width: 100%;
    min-height: 180px;
    border: 1px solid var(--scan-border);
    border-radius: 12px;
    background: #0b1018;
    object-fit: cover;
  }
  .scan-support {
    margin-top: 10px;
    color: var(--scan-muted);
    font-size: 12px;
    line-height: 1.5;
  }
  .scan-new-card-note {
    color: var(--scan-muted);
    font-size: 14px;
    line-height: 1.6;
  }
  .scan-mini-badge {
    padding: 4px 10px;
    border-radius: 999px;
    background: rgba(59, 130, 246, 0.14);
    color: #60a5fa;
    font-family: var(--scan-mono);
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
  }
  .scan-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.72);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
    padding: 20px;
  }
  .scan-dialog {
    width: 100%;
    max-width: 440px;
    background: #0f1219;
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 18px;
    padding: 24px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.38);
  }
  .scan-dialog-title {
    margin: 0 0 10px;
    font-size: 20px;
    font-weight: 700;
    color: #f8fafc;
  }
  .scan-dialog-copy {
    margin: 0;
    color: var(--scan-muted);
    font-size: 14px;
    line-height: 1.6;
  }
  .scan-dialog-actions {
    display: flex;
    flex-direction: row;
    gap: 10px;
    margin-top: 24px;
    align-items: stretch;
  }
  .scan-dialog-actions .scan-btn {
    flex: 1;
    margin-top: 0;
    width: auto;
    min-height: 44px;
  }
  .scan-btn-ghost {
    background: rgba(255, 255, 255, 0.06);
    color: #f8fafc;
  }
  @media (max-width: 1180px) {
    .scan-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 920px) {
    .scan-form-grid, .scan-row-3, .scan-dual-actions { grid-template-columns: 1fr; }
    /* scan-dialog-actions intentionally excluded — it uses flex, not grid */
  }
`;

const UNITS = ["kg", "g", "l", "ml", "pcs", "pkt", "dozen", "bottles"];
const WRITE_OFF_REASONS = ["Damaged", "Expired", "Lost", "Broken", "Other"];
const BARCODE_FORMATS = [
  "code_128",
  "code_39",
  "code_93",
  "codabar",
  "ean_13",
  "ean_8",
  "itf",
  "upc_a",
  "upc_e",
  "qr_code",
];

function extractUnit(quantity, fallback = "pcs") {
  const parts = String(quantity || "").trim().split(" ");
  return parts.length > 1 ? parts[parts.length - 1] : fallback;
}

function safeError(error, fallback) {
  const raw = error?.response?.data;
  if (Array.isArray(raw?.detail)) return raw.detail[0]?.msg || fallback;
  if (typeof raw?.message === "string") return raw.message;
  if (typeof raw?.detail === "string") return raw.detail;
  if (typeof error?.message === "string") return error.message;
  return fallback;
}

function makeUpdateForm(product) {
  const unit = product?.unit || extractUnit(product?.quantity, "pcs");
  return {
    product_name: product?.product_name || "",
    description: product?.description || "",
    add_quantity: "",
    unit_of_measure: unit,
    unit_price: product?.unit_price != null ? String(product.unit_price) : "",
  };
}

function makeSellForm(product) {
  return {
    quantity: "",
    unit_of_measure: product?.unit || extractUnit(product?.quantity, "pcs"),
    selling_price: product?.unit_price != null ? String(product.unit_price) : "",
  };
}

function makeDeleteForm(product) {
  return {
    quantity: "",
    unit_of_measure: product?.unit || extractUnit(product?.quantity, "pcs"),
    reason: "Damaged",
  };
}

function makeAddForm(barcode = "") {
  return {
    barcode,
    product_name: "",
    description: "",
    quantity: "",
    unit_of_measure: "pcs",
    unit_price: "",
  };
}

function findProduct(products, query) {
  const normalized = query.trim().toLowerCase();
  return products.find((product) => {
    const candidates = [product.product_id, product.barcode, product.product_name]
      .filter(Boolean)
      .map((value) => String(value).trim().toLowerCase());
    return candidates.includes(normalized);
  });
}

function hasBarcodeDetector() {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}

function getZxingReader(readerRef) {
  if (!readerRef.current) {
    readerRef.current = new BrowserMultiFormatReader();
  }
  return readerRef.current;
}

export default function ScanManage() {
  const [scanMode, setScanMode] = useState("manual");
  const [barcode, setBarcode] = useState("");
  const [fileName, setFileName] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);
  const [missingBarcode, setMissingBarcode] = useState("");
  const [activeAction, setActiveAction] = useState("update");
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteIntent, setDeleteIntent] = useState("writeoff");
  const [addForm, setAddForm] = useState(makeAddForm(""));
  const [updateForm, setUpdateForm] = useState(makeUpdateForm(null));
  const [sellForm, setSellForm] = useState(makeSellForm(null));
  const [deleteForm, setDeleteForm] = useState(makeDeleteForm(null));
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const zxingReaderRef = useRef(null);
  const zxingControlsRef = useRef(null);

  const loadProducts = async () => {
    // include_inactive=true so archived products are still findable
    // Ghost products (__ghost__xxx barcodes) are excluded — they are an
    // implementation artifact of the fallback delete path, never real products.
    const res = await getAllProducts(true);
    const all = res.data?.data ?? res.data ?? [];
    return Array.isArray(all)
      ? all.filter(p => !String(p.product_id || "").startsWith("__ghost__"))
      : [];
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await loadProducts();
      } catch (error) {
        setMessage({
          type: "error",
          text: safeError(error, "Failed to load products for scan lookup."),
        });
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    if (scanMode !== "camera") {
      stopCameraStream();
    }
    if (scanMode !== "image") {
      setFileName("");
    }
  }, [scanMode]);

  useEffect(() => () => stopCameraStream(), []);

  const syncForms = (product) => {
    setUpdateForm(makeUpdateForm(product));
    setSellForm(makeSellForm(product));
    setDeleteForm(makeDeleteForm(product));
  };

  const syncAddForm = (barcodeValue) => {
    setAddForm(makeAddForm(String(barcodeValue || "")));
  };

  const resolveProductByCode = async (query) => {
    if (!query) {
      setMessage({ type: "error", text: "Enter a barcode or product ID first." });
      return null;
    }

    try {
      const products = await loadProducts();
      const product = findProduct(products, query);

      if (!product) {
        setActiveProduct(null);
        syncForms(null);
        setMissingBarcode(String(query));
        syncAddForm(query);
        setActiveAction("add");
        setMessage({
          type: "success",
          text: `No product found for "${query}". Add it as a new product.`,
        });
        return null;
      }

      setActiveProduct(product);
      setMissingBarcode("");
      syncForms(product);
      setBarcode(String(query));
      // If inactive, route to Archive tab and warn — block Update/Sell
      if (product.is_active === false) {
        setActiveAction("archive");
        setMessage({
          type: "warn",
          text: `'${product.product_name}' is archived (inactive). Reactivate it from the Archive tab before making any changes.`,
        });
      } else {
        setActiveAction("update");
        setMessage({ type: "success", text: `${product.product_name} fetched successfully.` });
      }
      return product;
    } catch (error) {
      setMessage({
        type: "error",
        text: safeError(error, "Lookup failed. Please try again."),
      });
      return null;
    }
  };

  const detectCodesFromSource = async (source) => {
    if (!hasBarcodeDetector()) {
      throw new Error("Barcode scanning is not supported in this browser. Use manual lookup or a Chromium browser.");
    }

    const detector = new window.BarcodeDetector({ formats: BARCODE_FORMATS });
    const results = await detector.detect(source);
    const first = results?.[0]?.rawValue?.trim();
    if (!first) {
      throw new Error("No barcode detected. Try a clearer image or better lighting.");
    }
    return first;
  };

  const stopCameraStream = () => {
    if (zxingControlsRef.current) {
      zxingControlsRef.current.stop();
      zxingControlsRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  };

  const handleLookup = async () => {
    const query = barcode.trim();
    setLoadingLookup(true);
    setMessage({ type: "", text: "" });
    try {
      await resolveProductByCode(query);
    } finally {
      setLoadingLookup(false);
    }
  };

  const refreshSelectedProduct = async (barcodeValue) => {
    const products = await loadProducts();
    const updated = findProduct(products, String(barcodeValue));
    setActiveProduct(updated || null);
    syncForms(updated || null);
    return updated;
  };

  const handleImageSelection = async (event) => {
    const file = event.target.files?.[0];
    setFileName(file?.name || "");
    if (!file) return;

    setLoadingLookup(true);
    setMessage({ type: "", text: "" });

    try {
      let detectedCode = "";

      if (hasBarcodeDetector()) {
        const bitmap = await createImageBitmap(file);
        try {
          detectedCode = await detectCodesFromSource(bitmap);
        } finally {
          bitmap.close?.();
        }
      } else {
        const imageUrl = URL.createObjectURL(file);
        try {
          const detected = await getZxingReader(zxingReaderRef).decodeFromImageUrl(imageUrl);
          detectedCode = detected.getText();
        } finally {
          URL.revokeObjectURL(imageUrl);
        }
      }

      setBarcode(detectedCode);
      await resolveProductByCode(detectedCode);
    } catch (error) {
      setMessage({
        type: "error",
        text: safeError(error, error.message || "Image scan failed."),
      });
    } finally {
      setLoadingLookup(false);
    }
  };

  const startCameraScan = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage({
        type: "error",
        text: "Camera access is not supported in this browser.",
      });
      return;
    }

    stopCameraStream();
    setLoadingLookup(true);
    setMessage({ type: "", text: "" });

    try {
      if (hasBarcodeDetector()) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setCameraReady(true);
        setMessage({
          type: "success",
          text: "Camera is live. Point it at a barcode to auto-fetch the product.",
        });

        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const detectedCode = await detectCodesFromSource(videoRef.current);
            if (!detectedCode) return;

            stopCameraStream();
            setBarcode(detectedCode);
            setLoadingLookup(true);
            await resolveProductByCode(detectedCode);
            setLoadingLookup(false);
          } catch (error) {
            if (!String(error?.message || "").includes("No barcode detected")) {
              setMessage({
                type: "error",
                text: safeError(error, error.message || "Camera scan failed."),
              });
              stopCameraStream();
              setLoadingLookup(false);
            }
          }
        }, 900);
      } else {
        const controls = await getZxingReader(zxingReaderRef).decodeFromVideoDevice(
          undefined,
          videoRef.current,
          async (result, error, controlsInstance) => {
            if (result) {
              zxingControlsRef.current = controlsInstance;
              const detectedCode = result.getText();
              stopCameraStream();
              setBarcode(detectedCode);
              setLoadingLookup(true);
              await resolveProductByCode(detectedCode);
              setLoadingLookup(false);
            } else if (error && !String(error?.message || "").toLowerCase().includes("not found")) {
              setMessage({
                type: "error",
                text: safeError(error, error.message || "Camera scan failed."),
              });
            }
          }
        );

        zxingControlsRef.current = controls;
        setCameraReady(true);
        setMessage({
          type: "success",
          text: "Camera fallback is live. Point it at a barcode to auto-fetch the product.",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: safeError(error, error.message || "Unable to start camera."),
      });
      stopCameraStream();
    } finally {
      setLoadingLookup(false);
    }
  };

  const handleUpdateSubmit = async () => {
    if (!activeProduct) return;

    const payload = {};
    if (updateForm.product_name.trim() !== (activeProduct.product_name || "").trim()) {
      payload.product_name = updateForm.product_name.trim();
    }
    if (updateForm.description.trim() !== (activeProduct.description || "").trim()) {
      payload.description = updateForm.description.trim();
    }
    if (updateForm.add_quantity !== "") {
      if (Number(updateForm.add_quantity) <= 0) {
        setMessage({ type: "error", text: "Add quantity must be greater than 0." });
        return;
      }
      payload.quantity = Number(updateForm.add_quantity);
      payload.unit_of_measure = updateForm.unit_of_measure;
    }
    if (updateForm.unit_price !== "") {
      if (Number(updateForm.unit_price) <= 0) {
        setMessage({ type: "error", text: "Unit price must be greater than 0." });
        return;
      }
      payload.unit_price = Number(updateForm.unit_price);
      if (!payload.unit_of_measure) payload.unit_of_measure = updateForm.unit_of_measure;
    }
    if (Object.keys(payload).length === 0) {
      setMessage({ type: "error", text: "Nothing to update yet." });
      return;
    }

    setSubmitting(true);
    try {
      await updateProduct(activeProduct.product_id, payload);
      const updated = await refreshSelectedProduct(activeProduct.product_id);
      setBarcode(String(updated?.product_id || activeProduct.product_id));
      setMessage({ type: "success", text: "Product updated successfully." });
    } catch (error) {
      setMessage({ type: "error", text: safeError(error, "Failed to update product.") });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSellSubmit = async () => {
    if (!activeProduct) return;
    if (!sellForm.quantity || Number(sellForm.quantity) <= 0) {
      setMessage({ type: "error", text: "Enter a valid sell quantity." });
      return;
    }
    if (!sellForm.selling_price || Number(sellForm.selling_price) <= 0) {
      setMessage({ type: "error", text: "Enter a valid selling price." });
      return;
    }

    setSubmitting(true);
    try {
      await sellProduct(activeProduct.product_id, {
        quantity: Number(sellForm.quantity),
        unit_of_measure: sellForm.unit_of_measure,
        selling_price: Number(sellForm.selling_price),
      });
      const updated = await refreshSelectedProduct(activeProduct.product_id);
      setBarcode(String(updated?.product_id || activeProduct.product_id));
      setMessage({ type: "success", text: "Sale recorded successfully." });
    } catch (error) {
      setMessage({ type: "error", text: safeError(error, "Failed to sell product.") });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!activeProduct) return;

    setSubmitting(true);
    try {
      if (deleteForm.quantity !== "") {
        if (Number(deleteForm.quantity) <= 0) {
          setMessage({ type: "error", text: "Delete quantity must be greater than 0." });
          setSubmitting(false);
          return;
        }

        await deleteProduct(activeProduct.product_id, {
          quantity: Number(deleteForm.quantity),
          unit_of_measure: deleteForm.unit_of_measure,
          reason: deleteForm.reason.trim() || "Stock adjustment from scan module",
        });

        const updated = await refreshSelectedProduct(activeProduct.product_id);
        if (updated) {
          setBarcode(String(updated.product_id));
          setMessage({ type: "success", text: "Stock deleted successfully." });
        } else {
          setBarcode("");
          setActiveProduct(null);
          syncForms(null);
          setMessage({ type: "success", text: "Product removed successfully." });
        }
      } else {
        await deleteProduct(activeProduct.product_id);
        setBarcode("");
        await refreshSelectedProduct(activeProduct.product_id);
        setActiveProduct(null);
        syncForms(null);
        setMessage({ type: "success", text: "Product deleted successfully." });
      }
    } catch (error) {
      setMessage({ type: "error", text: safeError(error, "Failed to delete product.") });
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveSubmit = async () => {
    if (!activeProduct) return;
    setSubmitting(true);
    const isCurrentlyInactive = activeProduct.is_active === false;
    try {
      if (isCurrentlyInactive) {
        // Reactivate
        const { reactivateProduct } = await import("../services/productService");
        await reactivateProduct(activeProduct.product_id);
        // Refresh the product to get updated is_active status
        const products = await loadProducts();
        const updated = products.find(p => String(p.product_id) === String(activeProduct.product_id));
        if (updated) {
          setActiveProduct(updated);
          syncForms(updated);
          setActiveAction("update");
          setMessage({ type: "success", text: `'${activeProduct.product_name}' reactivated successfully! It is now visible in your active inventory.` });
        }
      } else {
        // Archive
        await archiveProduct(activeProduct.product_id);
        setMessage({ type: "success", text: `'${activeProduct.product_name}' marked as inactive. It is now hidden from the active inventory.` });
        setActiveProduct(null);
        setBarcode("");
        syncForms(null);
      }
    } catch (error) {
      setMessage({ type: "error", text: safeError(error, isCurrentlyInactive ? "Failed to reactivate product." : "Failed to archive product.") });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddSubmit = async () => {
    if (!addForm.barcode.trim()) {
      setMessage({ type: "error", text: "Barcode is required." });
      return;
    }
    if (!addForm.product_name.trim()) {
      setMessage({ type: "error", text: "Product name is required." });
      return;
    }
    if (!addForm.quantity || Number(addForm.quantity) <= 0) {
      setMessage({ type: "error", text: "Quantity must be greater than 0." });
      return;
    }
    if (!addForm.unit_price || Number(addForm.unit_price) <= 0) {
      setMessage({ type: "error", text: "Unit price must be greater than 0." });
      return;
    }

    setSubmitting(true);
    try {
      await addProduct({
        barcode: addForm.barcode.trim(),
        product_name: addForm.product_name.trim(),
        description: addForm.description.trim(),
        quantity: Number(addForm.quantity),
        unit_of_measure: addForm.unit_of_measure,
        unit_price: Number(addForm.unit_price),
      });

      const created = await refreshSelectedProduct(addForm.barcode.trim());
      setBarcode(addForm.barcode.trim());
      setMissingBarcode("");
      setActiveAction("update");
      setMessage({
        type: "success",
        text: created
          ? `${created.product_name} added successfully and is ready to manage.`
          : "Product added successfully.",
      });
    } catch (error) {
      setMessage({ type: "error", text: safeError(error, "Failed to add product.") });
    } finally {
      setSubmitting(false);
    }
  };

  const summaryQty = activeProduct?.quantity || "0 pcs";
  const summaryUnit = activeProduct?.unit || extractUnit(activeProduct?.quantity, "pcs");
  const summaryPrice = Number(activeProduct?.unit_price || 0);
  const summaryTotal = Number(activeProduct?.total_price || 0);

  return (
    <Layout>
      <style>{styles}</style>

      <div className="scan-shell">
        <div className="scan-grid">
          <div>
            <section className="scan-card">
              <div className="scan-title">Scan Barcode</div>

              <div className="scan-tabs">
                <button className={`scan-tab ${scanMode === "manual" ? "active" : ""}`} type="button" onClick={() => setScanMode("manual")}>
                  Manual
                </button>
                <button className={`scan-tab ${scanMode === "image" ? "active" : ""}`} type="button" onClick={() => { setScanMode("image"); setMessage({ type: "", text: "" }); }}>
                  Image
                </button>
                <button className={`scan-tab ${scanMode === "camera" ? "active" : ""}`} type="button" onClick={() => { setScanMode("camera"); setMessage({ type: "", text: "" }); }}>
                  Camera
                </button>
              </div>

              {scanMode === "manual" ? (
                <>
                  <label className="scan-label" htmlFor="scan-barcode">Barcode / Product ID</label>
                  <input
                    id="scan-barcode"
                    className="scan-input"
                    value={barcode}
                    onChange={(event) => setBarcode(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleLookup();
                    }}
                  />
                </>
              ) : (
                <>
                  <span className="scan-label">{scanMode === "image" ? "Barcode Image" : "Camera Scanner"}</span>
                  {scanMode === "image" ? (
                    <>
                      <label className="scan-input" style={{ minHeight: "120px", height: "auto", display: "grid", placeItems: "center", padding: "16px", textAlign: "center", cursor: "pointer" }}>
                        <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageSelection} />
                        <span>{fileName || "Click to upload a barcode image"}</span>
                      </label>
                      <div className="scan-support">
                        The uploaded image will be scanned automatically and matched to your product list.
                      </div>
                    </>
                  ) : (
                    <>
                      <video ref={videoRef} className="scan-camera" muted playsInline />
                      <div className="scan-support">
                        {cameraReady ? "Camera is live. Hold the barcode steady in front of the lens." : "Start the camera, then point it at the barcode to scan automatically."}
                      </div>
                    </>
                  )}
                </>
              )}

              {scanMode === "manual" ? (
                <button className="scan-btn scan-btn-lime" type="button" onClick={handleLookup} disabled={loadingLookup}>
                  {loadingLookup ? "Looking up..." : "Lookup"}
                </button>
              ) : null}

              {scanMode === "camera" ? (
                <button className="scan-btn scan-btn-lime" type="button" onClick={cameraReady ? stopCameraStream : startCameraScan} disabled={loadingLookup}>
                  {cameraReady ? "Stop Camera" : loadingLookup ? "Starting..." : "Start Camera"}
                </button>
              ) : null}
            </section>

            {activeProduct ? (
              <section className="scan-summary-card" style={{ marginTop: "16px" }}>
                <div className="scan-summary-top">
                  <div className="scan-product-name">{activeProduct.product_name}</div>
                  <div className="scan-badge">Exists</div>
                </div>

                <div className="scan-summary-grid">
                  <div>
                    <div className="scan-summary-label">Qty</div>
                    <div className="scan-summary-value">{summaryQty}</div>
                  </div>
                  <div>
                    <div className="scan-summary-label">Price</div>
                    <div className="scan-summary-value" style={{ color: "var(--scan-yellow)" }}>Rs{summaryPrice}</div>
                  </div>
                  <div>
                    <div className="scan-summary-label">Total</div>
                    <div className="scan-summary-value" style={{ color: "var(--scan-lime)" }}>Rs{summaryTotal}</div>
                  </div>
                  <div>
                    <div className="scan-summary-label">Unit</div>
                    <div className="scan-summary-value" style={{ fontSize: "16px" }}>{summaryUnit}</div>
                  </div>
                </div>
              </section>
            ) : missingBarcode ? (
              <section className="scan-summary-card" style={{ marginTop: "16px" }}>
                <div className="scan-summary-top">
                  <div className="scan-product-name">Barcode: {missingBarcode}</div>
                  <div className="scan-mini-badge">New</div>
                </div>
                <div className="scan-new-card-note">
                  This barcode isn&apos;t in your inventory. Fill in the details on the right to add it.
                </div>
              </section>
            ) : null}
          </div>

          <section className="scan-main">
            {message.text ? <div className={`scan-message ${message.type}`}>{message.text}</div> : null}

            {!activeProduct && !missingBarcode ? (
              <div className="scan-empty">
                <div>
                  <strong>Scan a barcode to get started</strong>
                  <div>Enter a real barcode or product ID on the left to fetch the product and manage stock here.</div>
                </div>
              </div>
            ) : (
              <>
                {activeProduct ? (
                  <div className="scan-action-tabs">
                    <button
                      className={`scan-action-tab ${activeAction === "update" ? "active" : ""}`}
                      type="button"
                      onClick={() => activeProduct?.is_active === false
                        ? setMessage({ type: "warn", text: "Reactivate this product before updating stock." })
                        : setActiveAction("update")}
                      style={activeProduct?.is_active === false ? { opacity: 0.4, cursor: "not-allowed" } : {}}
                    >Update</button>
                    <button
                      className={`scan-action-tab ${activeAction === "sell" ? "active" : ""}`}
                      type="button"
                      onClick={() => activeProduct?.is_active === false
                        ? setMessage({ type: "warn", text: "Reactivate this product before selling." })
                        : setActiveAction("sell")}
                      style={activeProduct?.is_active === false ? { opacity: 0.4, cursor: "not-allowed" } : {}}
                    >Sell</button>
                    <button className={`scan-action-tab ${activeAction === "archive" ? "active" : ""}`} type="button" onClick={() => setActiveAction("archive")}>Archive</button>
                    <button className={`scan-action-tab ${activeAction === "delete" ? "active" : ""}`} type="button" onClick={() => setActiveAction("delete")}>Delete</button>
                  </div>
                ) : (
                  <div className="scan-action-tabs" style={{ gridTemplateColumns: "1fr" }}>
                    <button className="scan-action-tab active" type="button">Add</button>
                  </div>
                )}

                {!activeProduct && missingBarcode ? (
                  <>
                    <div className="scan-form-grid">
                      <div>
                        <label className="scan-label">Barcode (Auto-filled)</label>
                        <input className="scan-input" value={addForm.barcode} onChange={(e) => setAddForm((form) => ({ ...form, barcode: e.target.value }))} />
                      </div>
                      <div>
                        <label className="scan-label">Product Name</label>
                        <input className="scan-input" placeholder="e.g. Sugar" value={addForm.product_name} onChange={(e) => setAddForm((form) => ({ ...form, product_name: e.target.value }))} />
                      </div>
                      <div className="scan-span-2">
                        <label className="scan-label">Description</label>
                        <textarea className="scan-textarea" placeholder="e.g. Refined white sugar" value={addForm.description} onChange={(e) => setAddForm((form) => ({ ...form, description: e.target.value }))} />
                      </div>
                    </div>

                    <div className="scan-row-3">
                      <div>
                        <label className="scan-label">Quantity</label>
                        <input className="scan-input" placeholder="e.g. 50" type="number" min="0" step="any" value={addForm.quantity} onChange={(e) => setAddForm((form) => ({ ...form, quantity: e.target.value }))} />
                      </div>
                      <div>
                        <label className="scan-label">Unit</label>
                        <select className="scan-select" value={addForm.unit_of_measure} onChange={(e) => setAddForm((form) => ({ ...form, unit_of_measure: e.target.value }))}>
                          {UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="scan-label">Unit Price</label>
                        <input className="scan-input" placeholder="e.g. 55" type="number" min="0" step="0.01" value={addForm.unit_price} onChange={(e) => setAddForm((form) => ({ ...form, unit_price: e.target.value }))} />
                      </div>
                    </div>

                    <button className="scan-btn scan-btn-lime" type="button" onClick={handleAddSubmit} disabled={submitting}>
                      {submitting ? "Adding..." : "Add to Inventory"}
                    </button>
                  </>
                ) : null}

                {activeAction === "update" ? (
                  <>
                    <div className="scan-form-grid">
                      <div>
                        <label className="scan-label">Barcode</label>
                        <input className="scan-input" value={activeProduct.product_id || ""} disabled />
                      </div>
                      <div>
                        <label className="scan-label">Product Name</label>
                        <input className="scan-input" value={updateForm.product_name} onChange={(e) => setUpdateForm((form) => ({ ...form, product_name: e.target.value }))} />
                      </div>
                      <div className="scan-span-2">
                        <label className="scan-label">Description</label>
                        <textarea className="scan-textarea" value={updateForm.description} onChange={(e) => setUpdateForm((form) => ({ ...form, description: e.target.value }))} />
                      </div>
                    </div>

                    <div className="scan-row-3">
                      <div>
                        <label className="scan-label">Add Qty</label>
                        <input className="scan-input" placeholder="Required" type="number" min="0" step="any" value={updateForm.add_quantity} onChange={(e) => setUpdateForm((form) => ({ ...form, add_quantity: e.target.value }))} />
                      </div>
                      <div>
                        <label className="scan-label">Unit</label>
                        <select className="scan-select" value={updateForm.unit_of_measure} onChange={(e) => setUpdateForm((form) => ({ ...form, unit_of_measure: e.target.value }))}>
                          {UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="scan-label">Unit Price</label>
                        <input className="scan-input" placeholder="Optional" type="number" min="0" step="0.01" value={updateForm.unit_price} onChange={(e) => setUpdateForm((form) => ({ ...form, unit_price: e.target.value }))} />
                      </div>
                    </div>

                    <button className="scan-btn scan-btn-lime" type="button" onClick={handleUpdateSubmit} disabled={submitting}>
                      {submitting ? "Updating..." : "Update Stock"}
                    </button>
                  </>
                ) : null}

                {activeAction === "sell" ? (
                  <>
                    <div className="scan-row-3" style={{ marginTop: 0 }}>
                      <div>
                        <label className="scan-label">Sell Qty</label>
                        <input className="scan-input" placeholder={`Available ${summaryQty}`} type="number" min="0" step="any" value={sellForm.quantity} onChange={(e) => setSellForm((form) => ({ ...form, quantity: e.target.value }))} />
                      </div>
                      <div>
                        <label className="scan-label">Unit</label>
                        <select className="scan-select" value={sellForm.unit_of_measure} onChange={(e) => setSellForm((form) => ({ ...form, unit_of_measure: e.target.value }))}>
                          {UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="scan-label">Selling Price</label>
                        <input className="scan-input" type="number" min="0" step="0.01" value={sellForm.selling_price} onChange={(e) => setSellForm((form) => ({ ...form, selling_price: e.target.value }))} />
                      </div>
                    </div>

                    <div className="scan-copy">
                      Sell uses the same backend flow as your existing inventory modal, just directly from the scan screen.
                    </div>

                    <button className="scan-btn scan-btn-lime" type="button" onClick={handleSellSubmit} disabled={submitting}>
                      {submitting ? "Selling..." : "Confirm Sale"}
                    </button>
                  </>
                ) : null}

                {activeAction === "archive" ? (
                  <>
                    <div style={{ padding: "8px 0 16px" }}>
                      {activeProduct?.is_active === false ? (
                        <div style={{
                          display: "flex", alignItems: "flex-start", gap: "14px",
                          background: "rgba(132,204,22,0.07)", border: "1px solid rgba(132,204,22,0.2)",
                          borderRadius: "14px", padding: "16px"
                        }}>
                          <span style={{ fontSize: 24 }}>🔄</span>
                          <div>
                            <div style={{ fontWeight: 700, marginBottom: 4, color: "#84cc16" }}>Product is Currently Inactive</div>
                            <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                              This product is archived and hidden from your active inventory. Click below to restore it
                              so it appears in your inventory and can be sold again.
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{
                          display: "flex", alignItems: "flex-start", gap: "14px",
                          background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)",
                          borderRadius: "14px", padding: "16px"
                        }}>
                          <span style={{ fontSize: 24 }}>📦</span>
                          <div>
                            <div style={{ fontWeight: 700, marginBottom: 4, color: "#f59e0b" }}>Mark as Inactive</div>
                            <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                              This hides the product from your active inventory list but keeps all transaction history.
                              You can reactivate it any time.
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      className="scan-btn"
                      type="button"
                      style={activeProduct?.is_active === false
                        ? { background: "#84cc16", color: "#121826", width: "100%", marginTop: 0 }
                        : { background: "#f59e0b", color: "#121826", width: "100%", marginTop: 0 }}
                      onClick={handleArchiveSubmit}
                      disabled={submitting}
                    >
                      {submitting
                        ? (activeProduct?.is_active === false ? "Reactivating…" : "Archiving…")
                        : activeProduct?.is_active === false
                          ? `✅ Reactivate '${activeProduct?.product_name}'`
                          : `Mark '${activeProduct?.product_name}' as Inactive`}
                    </button>
                  </>
                ) : null}

                {activeAction === "delete" ? (
                  <>
                    <div className="scan-row-3" style={{ marginTop: 0 }}>
                      <div>
                        <label className="scan-label">Write-Off Qty</label>
                        <input className="scan-input" placeholder="Leave blank for full delete" type="number" min="0" step="any" value={deleteForm.quantity} onChange={(e) => setDeleteForm((form) => ({ ...form, quantity: e.target.value }))} />
                      </div>
                      <div>
                        <label className="scan-label">Unit</label>
                        <select className="scan-select" value={deleteForm.unit_of_measure} onChange={(e) => setDeleteForm((form) => ({ ...form, unit_of_measure: e.target.value }))}>
                          {UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="scan-label">Reason</label>
                        <select className="scan-select" value={deleteForm.reason} onChange={(e) => setDeleteForm((form) => ({ ...form, reason: e.target.value }))}>
                          {WRITE_OFF_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="scan-message warn" style={{ marginTop: "16px", marginBottom: 0 }}>
                      {deleteForm.quantity
                        ? "Deleting with quantity will write off only that amount and log it as stock loss before commit."
                        : "Leaving quantity blank will permanently delete this product and log all remaining stock as a write-off loss."}
                    </div>

                    <div className="scan-dual-actions">
                      <button className="scan-btn" type="button" style={{ background: "#f5c243", color: "#121826" }} onClick={() => { setDeleteIntent("writeoff"); setConfirmDeleteOpen(true); }} disabled={submitting}>
                        Write-Off Qty
                      </button>
                      <button className="scan-btn scan-btn-danger" type="button" onClick={() => { setDeleteIntent("delete"); setConfirmDeleteOpen(true); }} disabled={submitting}>
                        Delete Product
                      </button>
                    </div>
                  </>
                ) : null}
              </>
            )}
          </section>
        </div>
      </div>

      {confirmDeleteOpen ? (
        <div className="scan-overlay" onClick={() => setConfirmDeleteOpen(false)}>
          <div className="scan-dialog" onClick={(e) => e.stopPropagation()}>
            {/* Icon */}
            <div style={{ fontSize: 36, marginBottom: 12, textAlign: "center" }}>
              {deleteIntent === "delete" ? "🗑️" : "📋"}
            </div>
            <h3 className="scan-dialog-title" style={{ textAlign: "center", marginBottom: 8 }}>
              {deleteIntent === "delete" ? "Confirm Full Delete" : "Confirm Write-Off"}
            </h3>
            <p className="scan-dialog-copy" style={{ textAlign: "center" }}>
              {deleteIntent === "delete"
                ? `This will permanently delete '${activeProduct?.product_name}' and write off all remaining stock as a loss.`
                : deleteForm.quantity
                  ? `Write off ${deleteForm.quantity} ${deleteForm.unit_of_measure} of '${activeProduct?.product_name}' as ${deleteForm.reason.toLowerCase()}.`
                  : `Write off all remaining stock of '${activeProduct?.product_name}' as ${deleteForm.reason.toLowerCase()}.`}
            </p>
            <div className="scan-dialog-actions">
              <button
                className="scan-btn scan-btn-ghost"
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
              >
                Cancel
              </button>
              <button
                className="scan-btn"
                type="button"
                style={
                  deleteIntent === "delete"
                    ? { background: "#f43f5e", color: "#fff" }
                    : { background: "#f5c243", color: "#121826" }
                }
                onClick={async () => {
                  setConfirmDeleteOpen(false);
                  await handleDeleteSubmit();
                }}
              >
                {deleteIntent === "delete" ? "Confirm Delete" : "Confirm Write-Off"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Layout>
  );
}
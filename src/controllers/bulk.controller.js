import {
    runBulkImportService,
    buildImportTemplateBuffer
} from "../services/bulkProduct.service.js";
import { runBulkMediaService } from "../services/bulkMedia.service.js";

/**
 * GET /api/product/bulk-template
 */
export const downloadImportTemplate = async (req, res) => {

    const buffer = buildImportTemplateBuffer();

    res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
        "Content-Disposition",
        "attachment; filename=product-import-template.xlsx"
    );

    res.status(200).send(buffer);
};

/**
 * POST /api/product/bulk-import
 */
export const bulkImportProducts = async (req, res) => {

    const {
        message,
        data
    } = await runBulkImportService(req.file);

    res.status(200).json({
        success: true,
        message,
        data
    });
};

/**
 * POST /api/product/bulk-media
 */
export const bulkUploadMedia = async (req, res) => {

    const batchDir = req.files?.[0]?.destination || null;

    const {
        message,
        data
    } = await runBulkMediaService(req.files, batchDir);

    res.status(200).json({
        success: true,
        message,
        data
    });
};

const express = require('express');
const { protect, admin } = require('../middleware');
const { Service } = require('../models');

const router = express.Router();

/**
 * @desc    Get all available services
 * @route   GET /api/services
 * @access  Public
 */
const getServices = async (req, res) => {
    try {
        const services = await Service.find({});
        res.json(services);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Add a new service to the catalog
 * @route   POST /api/services
 * @access  Private/Admin
 */
const addService = async (req, res) => {
    const { serviceName, category, basePrice, description, image } = req.body;

    try {
        const serviceExists = await Service.findOne({ serviceName });

        if (serviceExists) {
            return res.status(400).json({ message: 'Service already exists' });
        }

        const service = await Service.create({
            serviceName,
            category,
            basePrice,
            description,
            image,
        });

        if (service) {
            res.status(201).json(service);
        } else {
            res.status(400).json({ message: 'Invalid service data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Update an existing service
 * @route   PUT /api/services/:id
 * @access  Private/Admin
 */
const updateService = async (req, res) => {
    const { serviceName, category, basePrice, description, image } = req.body;

    try {
        const service = await Service.findById(req.params.id);

        if (service) {
            service.serviceName = serviceName || service.serviceName;
            service.category = category || service.category;
            service.basePrice = basePrice || service.basePrice;
            service.description = description || service.description;
            service.image = image || service.image;

            const updatedService = await service.save();
            res.json(updatedService);
        } else {
            res.status(404).json({ message: 'Service not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Delete a service from the catalog
 * @route   DELETE /api/services/:id
 * @access  Private/Admin
 */
const deleteService = async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);

        if (service) {
            await service.deleteOne();
            res.json({ message: 'Service removed' });
        } else {
            res.status(404).json({ message: 'Service not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

router.get('/', getServices);
router.post('/', protect, admin, addService);
router.put('/:id', protect, admin, updateService);
router.delete('/:id', protect, admin, deleteService);

module.exports = router;

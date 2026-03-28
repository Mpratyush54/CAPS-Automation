const { getDB } = require('../config/database');

class BaseModel {
    static collectionName = '';
    static schema = {};

    static collection() {
        return getDB().collection(this.collectionName);
    }

    static validate(doc = {}, { partial = false } = {}) {
        const errors = {};

        Object.entries(this.schema || {}).forEach(([field, rule]) => {
            const value = doc[field];

            if (!partial && rule.required && (value === undefined || value === null || value === '')) {
                errors[field] = `${field} is required.`;
                return;
            }

            if (value === undefined || value === null) {
                return;
            }

            if (rule.enum && !rule.enum.includes(value)) {
                errors[field] = `${field} must be one of: ${rule.enum.join(', ')}.`;
                return;
            }

            if (rule.type === 'array' && !Array.isArray(value)) {
                errors[field] = `${field} must be an array.`;
            }
        });

        return {
            valid: Object.keys(errors).length === 0,
            errors,
        };
    }

    static find(filter = {}, options = {}) {
        return this.collection().find(filter, options);
    }

    static findOne(filter = {}, options = {}) {
        return this.collection().findOne(filter, options);
    }

    static insertOne(doc, options = {}) {
        return this.collection().insertOne(doc, options);
    }

    static updateOne(filter, update, options = {}) {
        return this.collection().updateOne(filter, update, options);
    }

    static updateMany(filter, update, options = {}) {
        return this.collection().updateMany(filter, update, options);
    }

    static findOneAndUpdate(filter, update, options = {}) {
        return this.collection().findOneAndUpdate(filter, update, options);
    }

    static deleteOne(filter, options = {}) {
        return this.collection().deleteOne(filter, options);
    }

    static countDocuments(filter = {}, options = {}) {
        return this.collection().countDocuments(filter, options);
    }

    static aggregate(pipeline = [], options = {}) {
        return this.collection().aggregate(pipeline, options);
    }
}

module.exports = BaseModel;

const { getDB } = require('../config/database');
const { ObjectId } = require('mongodb');

class BaseModel {
    static collectionName = '';
    static schema = {};

    static collection() {
        return getDB().collection(this.collectionName);
    }

    static validate(doc = {}, { partial = false } = {}) {
        const errors = {};

        for (const [field, rule] of Object.entries(this.schema || {})) {
            const value = doc[field];

            // 1. Required Check
            if (!partial && rule.required && (value === undefined || value === null || value === '')) {
                errors[field] = `${field} is required.`;
                continue;
            }

            if (value === undefined || value === null) {
                continue;
            }

            // 2. Enum Check
            if (rule.enum) {
                if (rule.type === 'array' && Array.isArray(value)) {
                    const invalidElements = value.filter(v => !rule.enum.includes(v));
                    if (invalidElements.length > 0) {
                        errors[field] = `${field} contains invalid values: ${invalidElements.join(', ')}. Allowed: ${rule.enum.join(', ')}.`;
                    }
                } else if (!rule.enum.includes(value)) {
                    errors[field] = `${field} must be one of: ${rule.enum.join(', ')}.`;
                    continue;
                }
            }

            // 3. Type Checks
            if (rule.type === 'array') {
                if (!Array.isArray(value)) {
                    errors[field] = `${field} must be an array.`;
                }
            } else if (rule.type === 'string') {
                if (typeof value !== 'string') {
                    errors[field] = `${field} must be a string.`;
                }
            } else if (rule.type === 'number') {
                if (typeof value !== 'number' || isNaN(value)) {
                    errors[field] = `${field} must be a number.`;
                }
            } else if (rule.type === 'boolean') {
                if (typeof value !== 'boolean') {
                    errors[field] = `${field} must be a boolean.`;
                }
            } else if (rule.type === 'date') {
                if (!(value instanceof Date) && isNaN(Date.parse(value))) {
                    errors[field] = `${field} must be a valid date.`;
                }
            } else if (rule.type === 'objectId') {
                if (!(value instanceof ObjectId) && !ObjectId.isValid(value)) {
                    errors[field] = `${field} must be a valid ObjectId string.`;
                }
            }
        }

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

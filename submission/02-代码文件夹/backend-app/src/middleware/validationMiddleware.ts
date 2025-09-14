import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

import { ValidationError } from '../utils/EnhancedAppError';

export interface ValidationSchema {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}

export function validate(
  schema: ValidationSchema
): (req: Request, _res: Response, next: NextFunction) => void {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schema.body) {
        const { error } = schema.body.validate(req.body, { abortEarly: false, allowUnknown: true });
        if (error) throw new ValidationError(error.message);
      }
      if (schema.query) {
        const { error } = schema.query.validate(req.query, {
          abortEarly: false,
          allowUnknown: true,
        });
        if (error) throw new ValidationError(error.message);
      }
      if (schema.params) {
        const { error } = schema.params.validate(req.params, {
          abortEarly: false,
          allowUnknown: true,
        });
        if (error) throw new ValidationError(error.message);
      }
      next();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      next(err);
    }
  };
}

// Common validation schemas (minimal examples)
export const commonSchemas = {
  idParam: Joi.object({ id: Joi.string().required() }),
  pagination: Joi.object({
    page: Joi.number().min(1).default(1),
    pageSize: Joi.number().min(1).max(100).default(20),
  }),
  dateRange: Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().greater(Joi.ref('startDate')),
  }),
};

export default validate;

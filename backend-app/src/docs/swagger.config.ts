/**
 * Swagger Configuration (minimal, compile-safe)
 */

import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API',
      version: '1.0.0',
    },
  },
  apis: ['./src/routes/**/*.ts', './src/models/**/*.ts'],
};

const specs = swaggerJsdoc(options);
export default specs;

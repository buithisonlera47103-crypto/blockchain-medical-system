import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Blockchain EMR API',
    version: '1.0.0',
    license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' },
  },
  servers: [{ url: 'http://localhost:3001' }],
  components: {},
};

const swaggerOptions = {
  definition: swaggerDefinition,
  apis: ['./src/routes/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
export const swaggerUiOptions = { explorer: true } as const;
export default swaggerSpec;

import { livenessCheckMiddleware } from '../../src/middleware/healthCheck';

describe('livenessCheckMiddleware', () => {
  it('returns 200 and Alive payload', () => {
    const req: any = {};
    const statusMock = jest.fn().mockReturnThis();
    const jsonMock = jest.fn().mockReturnThis();
    const res: any = { status: statusMock, json: jsonMock };

    livenessCheckMiddleware(req, res, () => {});

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: 'Alive' }));
  });
});


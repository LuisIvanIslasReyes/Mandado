import { mensajeDeError } from './auth.service';

describe('mensajeDeError', () => {
  it('código incorrecto o vencido', () => {
    expect(mensajeDeError({ code: 'otp_expired', status: 403, name: 'AuthApiError' })).toContain(
      'no es correcto o ya venció',
    );
  });

  it('demasiados correos', () => {
    const porCodigo = mensajeDeError({
      code: 'over_email_send_rate_limit',
      status: 429,
      name: 'AuthApiError',
    });
    const porEstado = mensajeDeError({ code: undefined, status: 429, name: 'AuthApiError' });
    expect(porCodigo).toContain('Espera un minuto');
    expect(porEstado).toBe(porCodigo);
  });

  it('sin conexión', () => {
    expect(
      mensajeDeError({ code: undefined, status: 0, name: 'AuthRetryableFetchError' }),
    ).toContain('internet');
  });

  it('cualquier otro error', () => {
    expect(mensajeDeError({ code: 'unexpected_failure', status: 500, name: 'AuthApiError' })).toBe(
      'Algo salió mal. Intenta de nuevo en un momento.',
    );
  });
});

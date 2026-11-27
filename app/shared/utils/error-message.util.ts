import { FetchError } from 'ofetch';

interface ErrorResponse {
  details?: string;
  status?: string | number;
  message?: string;
  error?: string | { message?: string };
  msg?: string;
  detail?: string;
  [key: string]: unknown;
}

function parseFetchError(error: unknown): string {
  if (error instanceof FetchError) {
    const fetchError = error as FetchError;

    if (!fetchError.response) {
      if (
        fetchError.message.includes('Failed to fetch') ||
        fetchError.message.includes('timeout')
      ) {
        return 'No se pudo conectar con el servidor o la solicitud ha expirado. Por favor, verifica tu conexión a internet.';
      }
      return 'Ocurrió un error inesperado al realizar la solicitud. Por favor, intenta de nuevo.';
    }

    const { status } = fetchError;
    const data = fetchError.data;

    if (!status) {
      return 'Estatus desconocido';
    }

    switch (status) {
      case 404:
        return 'El recurso solicitado no fue encontrado.';
      case 403: {
        // El backend manda el motivo ya traducido en `detail` (p. ej. "No tienes permiso para eliminar tareas.").
        const detail = (data as { detail?: unknown } | undefined)?.detail;
        return typeof detail === 'string' && detail.trim() && detail !== 'must_change_password'
          ? detail
          : 'No tienes permisos para realizar esta acción.';
      }
      default:
        break;
    }

    try {
      if (typeof data === 'string') {
        const trimmed = data.trim();
        // Respuestas HTML (p. ej. página de debug de Django) o textos enormes:
        // no los mostramos crudos, damos un mensaje corto.
        if (trimmed.startsWith('<') || trimmed.length > 300) {
          return `Error ${status}: Ocurrió un problema en el servidor.`;
        }
        return trimmed;
      }

      if (typeof data === 'object' && data !== null) {
        const errorData = data as ErrorResponse;

        if (errorData.details && typeof errorData.details === 'string') {
          return errorData.details;
        }

        if (errorData.status && typeof errorData.status === 'string') {
          return errorData.status;
        }

        if (errorData.message && typeof errorData.message === 'string') {
          return errorData.message;
        }

        if (errorData.error) {
          if (typeof errorData.error === 'string') {
            return errorData.error;
          }
          if (typeof errorData.error === 'object' && errorData.error.message) {
            return errorData.error.message;
          }
        }

        if (errorData.msg && typeof errorData.msg === 'string') {
          return errorData.msg;
        }

        if (errorData.detail && typeof errorData.detail === 'string') {
          return errorData.detail;
        }

        if (Array.isArray(data)) {
          if (data.length === 0) {
            return `Error ${status}: No se pudo completar la operación.`;
          }

          if (typeof data[0] === 'string') {
            return data.join(', ');
          }

          const mensajes = data
            .map((item: unknown) => {
              if (typeof item === 'object' && item !== null) {
                const obj = item as ErrorResponse;
                return obj.message || obj.msg || obj.error || obj.details || '';
              }
              return '';
            })
            .filter((msg) => msg)
            .join(', ');

          return (
            mensajes || `Error ${status}: No se pudo completar la operación.`
          );
        }

        const errores = Object.keys(errorData)
          .filter((key) => errorData[key])
          .map((key) => {
            const valor = errorData[key];
            if (typeof valor === 'string') return valor;
            if (Array.isArray(valor)) {
              return valor
                .map((v) => (typeof v === 'string' ? v : ''))
                .filter((v) => v)
                .join(', ');
            }
            return '';
          })
          .filter((msg) => msg);

        if (errores.length > 0) {
          return errores.join('. ');
        }
      }
    } catch (e) {
      console.error('Error al parsear respuesta de error de $fetch:', e);
    }

    if (status >= 500) {
      return 'Error en el servidor. Por favor, intenta de nuevo más tarde.';
    }
    if (status === 401) {
      return 'No tienes autorización. Por favor, inicia sesión nuevamente.';
    }
    return `Error ${status}: No se pudo completar la operación.`;
  }

  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }

  return 'Ocurrió un error desconocido. Por favor, intenta de nuevo.';
}

export { parseFetchError };

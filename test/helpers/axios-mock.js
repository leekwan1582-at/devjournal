/**
 * Configurable axios stub.
 *
 * `axios.create()` returns a single fake instance whose HTTP methods record
 * every call and return canned responses (or throw configured errors).
 * data.js only uses the instance returned by `create`.
 */

function createAxiosMock() {
  const calls = [];
  const responses = { get: null, post: null, put: null, delete: null };
  const errors = { get: null, post: null, put: null, delete: null };

  const record = (method, args, response, error) => {
    calls.push({ method, ...args });
    if (error) {
      throw error;
    }
    return response;
  };

  const instance = {
    get: async (url, config) => record("get", { url, config }, responses.get, errors.get),
    post: async (url, body, config) =>
      record("post", { url, body, config }, responses.post, errors.post),
    put: async (url, body, config) =>
      record("put", { url, body, config }, responses.put, errors.put),
    delete: async (url, config) => record("delete", { url, config }, responses.delete, errors.delete),
  };

  return {
    instance,
    calls,
    // The real axios default instance also has these methods; ai.js calls
    // axios.post() directly, so mirror them here.
    get: instance.get,
    post: instance.post,
    put: instance.put,
    delete: instance.delete,
    /** Set the resolved response for a method. */
    on(method, response) {
      responses[method] = response;
      errors[method] = null;
    },
    /** Make a method reject with the given error. */
    fail(method, error) {
      errors[method] = error;
    },
    /** Clear recorded calls and configured responses/errors. */
    reset() {
      calls.length = 0;
      Object.keys(responses).forEach((key) => {
        responses[key] = null;
        errors[key] = null;
      });
    },
    // axios instance factory used by data.js
    create() {
      return instance;
    },
  };
}

module.exports = { createAxiosMock };

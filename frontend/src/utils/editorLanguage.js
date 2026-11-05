/**
 * Resolves the Monaco Editor language identifier based on the file extension.
 *
 * @param {string} filePath Relative file path
 * @returns {string} Monaco language mode
 */
export const getLanguageFromPath = (filePath = '') => {
  if (!filePath || typeof filePath !== 'string') return 'plaintext';

  const ext = filePath.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return 'javascript';

    case 'ts':
    case 'tsx':
      return 'typescript';

    case 'json':
      return 'json';

    case 'html':
    case 'htm':
      return 'html';

    case 'css':
    case 'scss':
    case 'less':
      return 'css';

    case 'md':
    case 'markdown':
      return 'markdown';

    case 'xml':
    case 'svg':
      return 'xml';

    case 'sql':
      return 'sql';

    case 'py':
      return 'python';

    case 'sh':
    case 'bash':
      return 'shell';

    case 'yaml':
    case 'yml':
      return 'yaml';

    default:
      return 'plaintext';
  }
};


/**
 * Builds a hierarchical tree structure from a flat array of file metadata.
 *
 * @param {Array} files Array of file objects with `file_path` and `id`
 * @returns {Array} Array of root-level tree nodes (folders and files)
 */
export const buildFileTree = (files = []) => {
  if (!Array.isArray(files) || files.length === 0) {
    return [];
  }

  const root = {
    name: '',
    path: '',
    isDirectory: true,
    children: {},
  };

  for (const file of files) {
    if (!file?.file_path) continue;

    const normalizedPath = file.file_path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    const segments = normalizedPath.split('/').filter(Boolean);

    let current = root;
    let accumulatedPath = '';

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${segment}` : segment;
      const isLastSegment = i === segments.length - 1;

      if (isLastSegment) {
        // File leaf node
        current.children[segment] = {
          id: file.id,
          name: segment,
          path: file.file_path,
          isDirectory: false,
          file,
        };
      } else {
        // Directory node
        if (!current.children[segment]) {
          current.children[segment] = {
            id: `dir:${accumulatedPath}`,
            name: segment,
            path: accumulatedPath,
            isDirectory: true,
            children: {},
          };
        }
        current = current.children[segment];
      }
    }
  }

  // Recursive converter from map of children to sorted array
  const convertChildren = (node) => {
    if (!node.children) return [];

    const entries = Object.values(node.children).map((child) => {
      if (child.isDirectory) {
        return {
          ...child,
          children: convertChildren(child),
        };
      }
      return child;
    });

    // Sort: directories first (alphabetical), then files (alphabetical)
    return entries.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  };

  return convertChildren(root);
};


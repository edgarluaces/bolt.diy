/**
 * Basic code validation to catch common syntax errors before writing to webcontainer
 * This helps prevent Vite transform errors in the preview
 */

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateCodeSyntax(content: string, filePath: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Skip validation for non-code files
  const codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'];
  const isCodeFile = codeExtensions.some((ext) => filePath.endsWith(ext));

  if (!isCodeFile) {
    return { isValid: true, errors, warnings };
  }

  // Check for common string literal issues
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    /*
     * Detect unescaped quotes in strings (common issue)
     * Simple heuristic: if we see `"..."..."` or `'...'...'` in the same line
     */
    const doubleQuoteMatches = line.match(/"/g);
    const singleQuoteMatches = line.match(/'/g);
    const backtickMatches = line.match(/`/g);

    // Odd number of quotes on a line (excluding comments and template literals)
    if (!line.trim().startsWith('//') && !line.includes('/*')) {
      if (doubleQuoteMatches && doubleQuoteMatches.length % 2 !== 0 && !line.includes('`')) {
        warnings.push(`Line ${lineNum}: Unbalanced double quotes - may cause string literal errors`);
      }

      if (singleQuoteMatches && singleQuoteMatches.length % 2 !== 0 && !line.includes('`')) {
        warnings.push(`Line ${lineNum}: Unbalanced single quotes - may cause string literal errors`);
      }

      if (backtickMatches && backtickMatches.length % 2 !== 0) {
        warnings.push(`Line ${lineNum}: Unbalanced template literal backticks`);
      }
    }

    // Check for common JSX/TSX issues
    if (filePath.endsWith('.jsx') || filePath.endsWith('.tsx')) {
      // Unclosed JSX tags (basic check)
      const openTags = (line.match(/<[^/][^>]*>/g) || []).length;
      const closeTags = (line.match(/<\/[^>]+>/g) || []).length;
      const selfClosing = (line.match(/\/>/g) || []).length;

      // This is a very basic check - not comprehensive
      if (openTags > closeTags + selfClosing && !line.includes('//')) {
        warnings.push(`Line ${lineNum}: Possible unclosed JSX tag`);
      }
    }

    // Check for malformed imports/exports
    if (line.includes('import') && !line.trim().startsWith('//')) {
      if (!line.includes('from') && !line.includes('{') && !line.includes('*')) {
        warnings.push(`Line ${lineNum}: Malformed import statement`);
      }
    }
  });

  /*
   * Check for syntax patterns that commonly break Vite
   * 1. Raw strings with newlines that should be template literals
   */
  if (content.match(/["'][\s\S]*?\n[\s\S]*?["']/)) {
    warnings.push('Detected multi-line strings without template literals - use backticks (`) instead');
  }

  // 2. Missing semicolons before certain statements (can cause issues)
  const problematicPatterns = [
    /\}\s*\n\s*\[/g, // } followed by [
    /\}\s*\n\s*\(/g, // } followed by (
  ];

  problematicPatterns.forEach((pattern) => {
    if (pattern.test(content)) {
      warnings.push('Detected potentially ambiguous syntax - consider adding semicolons');
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Attempt to fix common syntax issues automatically
 */
export function autoFixCommonIssues(content: string, filePath: string): string {
  let fixed = content;

  // Only fix code files
  const codeExtensions = ['.js', '.jsx', '.ts', '.tsx'];
  const isCodeFile = codeExtensions.some((ext) => filePath.endsWith(ext));

  if (!isCodeFile) {
    return content;
  }

  /*
   * Fix 1: Convert multi-line strings to template literals (if safe)
   * This is a conservative fix - only if the string doesn't contain backticks
   * Handle both single and double quotes separately
   */
  fixed = fixed.replace(/(["'])((?:(?!\1).)*?\n(?:(?!\1).)*?)\1/g, (match, quote, innerContent) => {
    // Only fix if it's a simple multi-line string without backticks or template vars
    if (!innerContent.includes('`') && !innerContent.includes('${')) {
      return `\`${innerContent}\``;
    }

    return match; // Leave as-is if complex
  });

  return fixed;
}

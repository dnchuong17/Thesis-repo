/**
 * Color Audit Utility
 *
 * This utility helps detect hardcoded hex color values in the codebase
 * that should be using theme tokens instead.
 *
 * Usage:
 *   npx ts-node app/utils/colorAudit.ts
 *
 * Or add to package.json:
 *   "audit:colors": "ts-node app/utils/colorAudit.ts"
 */

import * as fs from "fs"
import * as path from "path"

// List of allowed hardcoded hex colors (e.g., in SVGs, comments, etc.)
const ALLOWED_PATTERNS = [
  /\/\/.*/g, // Comments
  /\/\*[\s\S]*?\*\//g, // Block comments
  /#\{.*?\}/g, // Template literals (interpolation)
]

interface ColorMatch {
  file: string
  line: number
  lineContent: string
  color: string
  column: number
}

interface AuditResult {
  totalMatches: number
  matches: ColorMatch[]
  summary: {
    byFile: Record<string, number>
    byColor: Record<string, number>
  }
}

function isInComment(content: string, index: number): boolean {
  // Check if position is within a comment
  const beforeContent = content.substring(0, index)

  // Check for line comment
  if (beforeContent.includes("//")) {
    const lastLineStart = beforeContent.lastIndexOf("\n")
    const lastLineCommentStart = beforeContent.lastIndexOf("//")
    if (lastLineCommentStart > lastLineStart) {
      return true
    }
  }

  // Check for block comment
  const blockCommentStart = beforeContent.lastIndexOf("/*")
  const blockCommentEnd = beforeContent.lastIndexOf("*/")
  if (blockCommentStart > blockCommentEnd) {
    return true
  }

  return false
}

function findColorMatches(filePath: string, content: string): ColorMatch[] {
  const matches: ColorMatch[] = []
  const colorRegex = /#[0-9A-Fa-f]{6}(?![0-9A-Fa-f])/g

  let match
  while ((match = colorRegex.exec(content)) !== null) {
    // Skip if in comment
    if (isInComment(content, match.index)) {
      continue
    }

    // Skip theme-related files (colors.ts, colorsDark.ts, etc.)
    if (filePath.includes("theme/colors") || filePath.includes("colorsDark")) {
      continue
    }

    const lines = content.substring(0, match.index).split("\n")
    const line = lines.length
    const column = lines[lines.length - 1].length + 1

    matches.push({
      file: filePath,
      line,
      lineContent: lines[lines.length - 1] + content.split("\n")[line],
      color: match[0],
      column,
    })
  }

  return matches
}

function getTypeScriptFiles(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    // Skip node_modules and hidden directories
    if (entry.name === "node_modules" || entry.name.startsWith(".")) {
      continue
    }

    if (entry.isDirectory()) {
      getTypeScriptFiles(fullPath, files)
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath)
    }
  }

  return files
}

function auditColors(rootDir: string = process.cwd()): AuditResult {
  // Find all TypeScript/TSX files
  const appDir = path.join(rootDir, "app")
  const files = getTypeScriptFiles(appDir).map((f) => path.relative(rootDir, f))

  const allMatches: ColorMatch[] = []

  for (const file of files) {
    const filePath = path.join(rootDir, file)
    const content = fs.readFileSync(filePath, "utf-8")
    const matches = findColorMatches(file, content)
    allMatches.push(...matches)
  }

  // Build summary
  const summary = {
    byFile: {} as Record<string, number>,
    byColor: {} as Record<string, number>,
  }

  for (const match of allMatches) {
    summary.byFile[match.file] = (summary.byFile[match.file] || 0) + 1
    summary.byColor[match.color] = (summary.byColor[match.color] || 0) + 1
  }

  return {
    totalMatches: allMatches.length,
    matches: allMatches,
    summary,
  }
}

function formatReport(result: AuditResult): string {
  let report = "\n=== COLOR AUDIT REPORT ===\n\n"

  report += `Total hardcoded colors found: ${result.totalMatches}\n\n`

  if (result.totalMatches === 0) {
    report += "✓ No hardcoded colors found! All colors are using theme tokens.\n"
    return report
  }

  // By File
  report += "## By File\n"
  for (const [file, count] of Object.entries(result.summary.byFile).sort((a, b) => b[1] - a[1])) {
    report += `  ${file}: ${count} occurrences\n`
  }

  // By Color
  report += "\n## By Color\n"
  for (const [color, count] of Object.entries(result.summary.byColor).sort((a, b) => b[1] - a[1])) {
    report += `  ${color}: ${count} occurrences\n`
  }

  // Detailed matches
  if (result.matches.length > 0 && result.matches.length <= 50) {
    report += "\n## Detailed Matches\n"
    for (const match of result.matches) {
      report += `\n  ${match.file}:${match.line}:${match.column}\n`
      report += `    ${match.color}\n`
      report += `    > ${match.lineContent.trim().substring(0, 80)}\n`
    }
  }

  report += "\n=== END REPORT ===\n"
  return report
}

// Main
if (require.main === module) {
  const result = auditColors()
  const report = formatReport(result)
  console.log(report)

  // Exit with non-zero if colors found
  process.exit(result.totalMatches > 0 ? 1 : 0)
}

export { auditColors, formatReport, ColorMatch, AuditResult }

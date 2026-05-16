import * as fs from "fs"
import * as path from "path"

// Allowed Tailwind utility classes for typography
const ALLOWED_T_SIZES = [
  "text-xs",
  "text-sm",
  "text-base",
  "text-lg",
  "text-xl",
  "text-2xl",
  "text-3xl",
  "text-4xl",
]
const ALLOWED_T_WEIGHTS = ["font-normal", "font-bold"]
const ALLOWED_OPACITIES = [
  "text-foreground",
  "text-foreground/80",
  "text-foreground/60",
  "text-foreground/50",
  "text-primary",
  "text-destructive",
  "text-muted-foreground",
]

interface TypographyMatch {
  file: string
  line: number
  lineContent: string
  violation: string
  column: number
}

interface AuditResult {
  totalMatches: number
  matches: TypographyMatch[]
}

function findTypographyViolations(filePath: string, content: string): TypographyMatch[] {
  const matches: TypographyMatch[] = []

  // Checking line by line to keep it simple and accurate for line numbers
  const lines = content.split("\n")

  lines.forEach((lineText, index) => {
    // skip comments
    if (
      lineText.trim().startsWith("//") ||
      lineText.trim().startsWith("/*") ||
      lineText.trim().startsWith("*")
    ) {
      return
    }

    // Check for inline fontSize
    let match = lineText.match(/fontSize:\s*['"]?\d+['"]?/)
    if (match) {
      matches.push({
        file: filePath,
        line: index + 1,
        lineContent: lineText.trim(),
        violation: `Inline fontSize found: ${match[0]}`,
        column: match.index! + 1,
      })
    }

    // Check for inline fontWeight
    match = lineText.match(/fontWeight:\s*['"]?[A-Za-z0-9]+['"]?/)
    if (
      match &&
      !lineText.includes('fontWeight: "400"') &&
      !lineText.includes('fontWeight: "700"') &&
      !lineText.includes('fontWeight: "normal"') &&
      !lineText.includes('fontWeight: "bold"')
    ) {
      matches.push({
        file: filePath,
        line: index + 1,
        lineContent: lineText.trim(),
        violation: `Invalid inline fontWeight found: ${match[0]}`,
        column: match.index! + 1,
      })
    }

    // Check for inline fontFamily
    match = lineText.match(/fontFamily:\s*['"]?[A-Za-z0-9\s]+['"]?/)
    if (
      match &&
      !lineText.includes("Mulish") &&
      !lineText.includes("theme") &&
      !lineText.includes("fontFamily: typography.")
    ) {
      matches.push({
        file: filePath,
        line: index + 1,
        lineContent: lineText.trim(),
        violation: `Inline fontFamily found: ${match[0]}`,
        column: match.index! + 1,
      })
    }

    // Check for invalid tailwind font weights (e.g., font-medium, font-semibold)
    match = lineText.match(/font-(thin|extralight|light|medium|semibold|extrabold|black)/)
    if (match) {
      matches.push({
        file: filePath,
        line: index + 1,
        lineContent: lineText.trim(),
        violation: `Invalid wind fontWeight class found: ${match[0]}`,
        column: match.index! + 1,
      })
    }

    // Check for invalid text sizes outside hierarchy
    match = lineText.match(/text-(5xl|6xl|7xl|8xl|9xl)/)
    if (match) {
      matches.push({
        file: filePath,
        line: index + 1,
        lineContent: lineText.trim(),
        violation: `Invalid tailwind text size found: ${match[0]}`,
        column: match.index! + 1,
      })
    }
  })

  return matches
}

function getTypeScriptFiles(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue
    if (entry.isDirectory()) {
      getTypeScriptFiles(fullPath, files)
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath)
    }
  }
  return files
}

function auditTypography(rootDir: string = process.cwd()): AuditResult {
  const appDir = path.join(rootDir, "app")
  const files = getTypeScriptFiles(appDir).map((f) => path.relative(rootDir, f))
  const allMatches: TypographyMatch[] = []

  for (const file of files) {
    const filePath = path.join(rootDir, file)
    const content = fs.readFileSync(filePath, "utf-8")
    const matches = findTypographyViolations(file, content)
    allMatches.push(...matches)
  }

  return {
    totalMatches: allMatches.length,
    matches: allMatches,
  }
}

function formatReport(result: AuditResult): string {
  let report = "\n=== TYPOGRAPHY AUDIT REPORT ===\n\n"
  report += `Total violations found: ${result.totalMatches}\n\n`

  if (result.totalMatches === 0) {
    report += "✓ No typography hierarchy violations found!\n"
    return report
  }

  if (result.matches.length > 0) {
    report += "\n## Detailed Violations\n"
    for (const match of result.matches) {
      report += `\n  ${match.file}:${match.line}:${match.column}\n`
      report += `    ${match.violation}\n`
      report += `    > ${match.lineContent.substring(0, 80)}\n`
    }
  }

  report += "\n=== END REPORT ===\n"
  return report
}

if (require.main === module) {
  const result = auditTypography()
  console.log(formatReport(result))
  process.exit(result.totalMatches > 0 ? 1 : 0)
}

export { auditTypography, formatReport, TypographyMatch, AuditResult }

// Kredits "Record in Kredits" App Intent.
//
// Appears as a ready-made action in the Shortcuts app so a Wallet ("Transaction")
// automation can hand every Apple Pay tap to Kredits. Runs in the background
// (openAppWhenRun = false), never shows UI, never touches the network.
//
// It appends the receipt to a JSON file in the app's Documents folder, which
// the JavaScript side reads (expo-file-system) on launch / foreground, and it
// posts a local notification so the user has immediate proof it fired.

import AppIntents
import Foundation
import UserNotifications

@available(iOS 16.0, *)
struct RecordReceiptIntent: AppIntent {
  static var title: LocalizedStringResource = "Record in Kredits"
  static var description = IntentDescription("Records a purchase in Kredits. Use it in a Wallet automation so Apple Pay taps are logged automatically.")
  static var openAppWhenRun: Bool = false

  @Parameter(title: "Amount", description: "The amount paid, e.g. the Amount from the Wallet transaction")
  var amount: String

  @Parameter(title: "Merchant", description: "Merchant or name from the Wallet transaction")
  var merchant: String?

  @Parameter(title: "Card", description: "Card name from the Wallet transaction")
  var card: String?

  static var parameterSummary: some ParameterSummary {
    Summary("Record \(\.$amount) at \(\.$merchant) paid with \(\.$card)")
  }

  static let fileName = "kredits-capture-queue.json"

  static func queueURL() -> URL? {
    FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first?.appendingPathComponent(fileName)
  }

  func perform() async throws -> some IntentResult {
    guard let url = Self.queueURL() else { return .result() }
    var queue: [[String: Any]] = []
    if let data = try? Data(contentsOf: url),
       let parsed = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
      queue = parsed
    }
    let now = Int(Date().timeIntervalSince1970 * 1000)
    var entry: [String: Any] = ["amount": amount, "at": now]
    if let merchant = merchant, !merchant.isEmpty { entry["merchant"] = merchant }
    if let card = card, !card.isEmpty { entry["card"] = card }
    queue.append(entry)
    if queue.count > 500 { queue.removeFirst(queue.count - 500) }
    if let data = try? JSONSerialization.data(withJSONObject: queue) {
      try? data.write(to: url, options: [.atomic])
    }

    // Immediate proof the automation fired, even before the app files it.
    let content = UNMutableNotificationContent()
    content.title = "Kredits"
    var body = "Captured \(amount)"
    if let m = merchant, !m.isEmpty { body += " at \(m)" }
    content.body = body
    content.sound = nil
    let request = UNNotificationRequest(identifier: "capture-\(now)", content: content, trigger: nil)
    try? await UNUserNotificationCenter.current().add(request)
    return .result()
  }
}

// "Record bank message in Kredits": a Shortcuts Message automation hands one
// incoming bank text to Kredits. OTP / verification texts are dropped here,
// before anything is written, so codes never reach disk.
@available(iOS 16.0, *)
struct RecordBankMessageIntent: AppIntent {
  static var title: LocalizedStringResource = "Record bank message in Kredits"
  static var description = IntentDescription("Records a purchase or deposit from a bank text message. Verification codes are ignored and never saved.")
  static var openAppWhenRun: Bool = false

  @Parameter(title: "Message", description: "The text of the bank message (Shortcut Input)")
  var message: String

  @Parameter(title: "Sender", description: "Optional: the bank name")
  var sender: String?

  static var parameterSummary: some ParameterSummary {
    Summary("Record bank message \(\.$message)") {
      \.$sender
    }
  }

  static let otpMarkers = [
    "otp", "one time password", "one-time password", "one time pin", "verification code", "verify code",
    "security code", "activation code", "passcode", "do not share", "don't share", "never share",
    "رمز التحقق", "رمز التفعيل", "كلمة المرور لمرة واحدة", "كلمة مرور لمرة واحدة", "الرقم السري لمرة واحدة", "لا تشارك", "لا تفصح", "كود التحقق",
  ]

  func perform() async throws -> some IntentResult {
    let lower = message.lowercased()
    if Self.otpMarkers.contains(where: { lower.contains($0) }) { return .result() }
    guard let url = RecordReceiptIntent.queueURL() else { return .result() }
    var queue: [[String: Any]] = []
    if let data = try? Data(contentsOf: url),
       let parsed = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
      queue = parsed
    }
    let now = Int(Date().timeIntervalSince1970 * 1000)
    var entry: [String: Any] = ["kind": "sms", "body": message, "at": now]
    if let sender = sender, !sender.isEmpty { entry["sender"] = sender }
    queue.append(entry)
    if queue.count > 500 { queue.removeFirst(queue.count - 500) }
    if let data = try? JSONSerialization.data(withJSONObject: queue) {
      try? data.write(to: url, options: [.atomic])
    }
    // Say exactly what was recorded. Texts without an amount and a purchase or
    // deposit meaning stay silent (the app files or ignores them on next open).
    if let parsed = BankTextParser.parse(message) {
      let content = UNMutableNotificationContent()
      content.title = "Kredits"
      content.body = BankTextParser.notificationBody(parsed)
      let request = UNNotificationRequest(identifier: "sms-\(now)", content: content, trigger: nil)
      try? await UNUserNotificationCenter.current().add(request)
    }
    return .result()
  }
}

// Minimal on-device parser for bank texts, mirroring src/sms/extractor.ts, so
// the notification can say exactly what was recorded without opening the app.
struct BankTextParser {
  struct Result { let amount: Double; let currency: String?; let merchant: String?; let incoming: Bool }

  static let num = "([0-9]{1,3}(?:,[0-9]{3})+(?:\\.[0-9]+)?|[0-9]+(?:\\.[0-9]+)?)"
  static let currencyTokens: [(String, [String])] = [
    ("EGP", ["EGP", "E£", "L\\.?E", "جنيه", "ج\\.?م"]),
    ("USD", ["USD", "\\$", "دولار"]),
    ("EUR", ["EUR", "€", "يورو"]),
    ("GBP", ["GBP", "£", "استرليني", "إسترليني"]),
    ("AED", ["AED", "د\\.?إ", "درهم"]),
    ("KWD", ["KWD", "د\\.?ك", "دينار كويتي"]),
    ("QAR", ["QAR", "ر\\.?ق", "ريال قطري"]),
    ("JOD", ["JOD", "د\\.?أ", "دينار أردني"]),
    ("BHD", ["BHD", "د\\.?ب", "دينار بحريني"]),
    ("OMR", ["OMR", "ر\\.?ع", "ريال عماني"]),
    ("SAR", ["SAR", "SR", "ر\\.?س", "ريال سعودي", "ريال"]),
  ]
  static let outWords = ["debited", "debit", "withdrawn", "withdrawal", "withdraw", "purchase", "spent", "payment", "paid", "deducted", "charged", "transfer to", "sent to", "pos", "transaction", "trx", "خصم", "مدين", "سحب", "شراء", "دفع", "مشتريات", "مشترياتك", "سداد", "اقتطاع", "حوالة صادرة", "تم خصم", "مبلغ صادر", "عملية"]
  static let inWords = ["credited", "credit", "deposited", "deposit", "received", "refund", "salary", "added", "transfer from", "received from", "إيداع", "ايداع", "دائن", "إضافة", "اضافة", "استلام", "راتب", "حوالة واردة", "تم إضافة", "أضيف", "اضيف", "مبلغ وارد"]
  static let symbols = ["EGP": "E£", "USD": "$", "EUR": "€", "GBP": "£", "SAR": "SR", "AED": "AED", "KWD": "KD", "QAR": "QR", "JOD": "JD", "BHD": "BD", "OMR": "OR"]

  static func normalizeDigits(_ s: String) -> String {
    var out = ""
    for u in s.unicodeScalars {
      let v = u.value
      if v >= 0x0660 && v <= 0x0669 { out += String(v - 0x0660) }
      else if v >= 0x06F0 && v <= 0x06F9 { out += String(v - 0x06F0) }
      else if v == 0x066B { out += "." }
      else if v == 0x066C { out += "," }
      else { out.unicodeScalars.append(u) }
    }
    return out
  }

  static func firstGroup(_ pattern: String, _ text: String) -> String? {
    guard let re = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else { return nil }
    let range = NSRange(text.startIndex..., in: text)
    guard let m = re.firstMatch(in: text, range: range), m.numberOfRanges > 1, let r = Range(m.range(at: 1), in: text) else { return nil }
    return String(text[r])
  }

  static func toNumber(_ s: String) -> Double? { Double(s.replacingOccurrences(of: ",", with: "")) }

  static func amountCurrency(_ text: String) -> (Double, String?)? {
    for (code, tokens) in currencyTokens {
      for tok in tokens {
        if let g = firstGroup(tok + "\\s*" + num, text), let v = toNumber(g) { return (v, code) }
        if let g = firstGroup(num + "\\s*" + tok, text), let v = toNumber(g) { return (v, code) }
      }
    }
    return nil
  }

  static func merchant(_ text: String) -> String? {
    if let raw = firstGroup("\\b(?:at|to|from|for)\\s+([A-Za-z][A-Za-z0-9 &'-]{1,28})", text) {
      var v = raw
      if let re = try? NSRegularExpression(pattern: "\\s+(on|ref|your|with|using|via|account|acct|card|bal|balance)\\b.*$", options: [.caseInsensitive]) {
        v = re.stringByReplacingMatches(in: v, range: NSRange(v.startIndex..., in: v), withTemplate: "")
      }
      v = v.trimmingCharacters(in: .whitespaces)
      if v.count >= 2 { return v }
    }
    let stop: Set<String> = ["حسابك", "حساب", "حسابكم", "الرصيد", "رصيد", "بطاقتك", "بطاقة", "المتاح"]
    for p in ["لدى\\s+([^\\d\\n،.]{2,28})", "في\\s+([^\\d\\n،.]{2,28})", "إلى\\s+([^\\d\\n،.]{2,28})", "الى\\s+([^\\d\\n،.]{2,28})"] {
      if let raw = firstGroup(p, text) {
        let v = raw.trimmingCharacters(in: .whitespaces)
        if v.count >= 2, let first = v.split(separator: " ").first, !stop.contains(String(first)) { return v }
      }
    }
    return nil
  }

  /// Nil when the text has no currency-tagged amount or no purchase/deposit meaning.
  static func parse(_ raw: String) -> Result? {
    let text = normalizeDigits(raw)
    let lower = text.lowercased()
    guard let (amount, currency) = amountCurrency(text), amount > 0 else { return nil }
    let outs = outWords.filter { lower.contains($0) }.count
    let ins = inWords.filter { lower.contains($0) }.count
    if outs == 0 && ins == 0 { return nil }
    return Result(amount: amount, currency: currency, merchant: merchant(text), incoming: ins > outs)
  }

  static func format(_ r: Result) -> String {
    let f = NumberFormatter()
    f.numberStyle = .decimal
    f.minimumFractionDigits = 2
    f.maximumFractionDigits = 2
    f.locale = Locale(identifier: "en_US_POSIX")
    f.usesGroupingSeparator = true
    f.groupingSeparator = ","
    let n = f.string(from: NSNumber(value: r.amount)) ?? String(r.amount)
    let sym = r.currency.flatMap { symbols[$0] } ?? (r.currency ?? "")
    return sym.isEmpty ? n : "\(sym) \(n)"
  }

  static func notificationBody(_ r: Result) -> String {
    let money = format(r)
    if r.incoming { return "Recorded \(money) received" + (r.merchant.map { " from \($0)" } ?? "") }
    return "Recorded \(money)" + (r.merchant.map { " at \($0)" } ?? "")
  }
}

// Lists both actions under Kredits in the Shortcuts app (and to Siri).
@available(iOS 16.0, *)
struct KreditsShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: RecordReceiptIntent(),
      phrases: ["Record a purchase in \(.applicationName)", "Log a receipt in \(.applicationName)"],
      shortTitle: "Record purchase",
      systemImageName: "creditcard"
    )
    AppShortcut(
      intent: RecordBankMessageIntent(),
      phrases: ["Record a bank message in \(.applicationName)"],
      shortTitle: "Record bank message",
      systemImageName: "message"
    )
  }
}

import UIKit
import UniformTypeIdentifiers
import LinkPresentation

final class ShareViewController: UIViewController {
  private let appScheme = "songscraper://import-reel"
  private let linkPresentationType = "com.apple.linkpresentation.metadata"

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    Task { await handleSharedInput() }
  }

  private func handleSharedInput() async {
    guard let extensionItems = extensionContext?.inputItems as? [NSExtensionItem] else {
      finish()
      return
    }

    for item in extensionItems {
      if let sharedText = extractText(from: item.attributedContentText) {
        openHostApp(with: sharedText)
        return
      }

      if let sharedText = extractText(from: item.attributedTitle) {
        openHostApp(with: sharedText)
        return
      }

      guard let attachments = item.attachments else { continue }
      for provider in attachments {
        if let sharedURL = await loadLinkMetadataURL(from: provider) {
          openHostApp(with: sharedURL.absoluteString)
          return
        }

        if let sharedURL = await loadURL(from: provider) {
          openHostApp(with: sharedURL.absoluteString)
          return
        }

        if let sharedText = await loadText(from: provider) {
          openHostApp(with: sharedText)
          return
        }
      }
    }

    finish()
  }

  private func extractText(from attributedText: NSAttributedString?) -> String? {
    guard let text = attributedText?.string.trimmingCharacters(in: .whitespacesAndNewlines),
          !text.isEmpty else {
      return nil
    }
    return text
  }

  private func loadLinkMetadataURL(from provider: NSItemProvider) async -> URL? {
    guard provider.hasItemConformingToTypeIdentifier(linkPresentationType) else {
      return nil
    }

    do {
      let item = try await provider.loadItem(forTypeIdentifier: linkPresentationType, options: nil)
      guard let metadata = item as? LPLinkMetadata else {
        return nil
      }
      return metadata.originalURL ?? metadata.url
    } catch {
      return nil
    }
  }

  private func loadURL(from provider: NSItemProvider) async -> URL? {
    let urlTypes = [
      UTType.url.identifier,
      UTType.fileURL.identifier,
    ]

    for typeIdentifier in urlTypes where provider.hasItemConformingToTypeIdentifier(typeIdentifier) {
      do {
        let item = try await provider.loadItem(forTypeIdentifier: typeIdentifier, options: nil)
        if let url = item as? URL { return url }
        if let text = item as? String { return URL(string: text) }
        if let data = item as? Data, let text = String(data: data, encoding: .utf8) {
          return URL(string: text)
        }
      } catch {
        continue
      }
    }

    return nil
  }

  private func loadText(from provider: NSItemProvider) async -> String? {
    let textTypes = [
      UTType.plainText.identifier,
      UTType.text.identifier,
    ]

    for typeIdentifier in textTypes where provider.hasItemConformingToTypeIdentifier(typeIdentifier) {
      do {
        let item = try await provider.loadItem(forTypeIdentifier: typeIdentifier, options: nil)
        if let text = item as? String, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
          return text
        }
        if let data = item as? Data,
           let text = String(data: data, encoding: .utf8),
           !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
          return text
        }
      } catch {
        continue
      }
    }

    return nil
  }

  @MainActor
  private func openHostApp(with sharedText: String) {
    guard var components = URLComponents(string: appScheme) else {
      finish()
      return
    }

    components.queryItems = [URLQueryItem(name: "text", value: sharedText)]

    guard let url = components.url else {
      finish()
      return
    }

    extensionContext?.open(url) { [weak self] opened in
      DispatchQueue.main.async {
        if opened {
          self?.finish()
        } else {
          self?.openHostAppViaResponderChain(url)
        }
      }
    }
  }

  @MainActor
  private func openHostAppViaResponderChain(_ url: URL) {
    let selector = NSSelectorFromString("openURL:")
    var responder: UIResponder? = self

    while let currentResponder = responder {
      if currentResponder.responds(to: selector) {
        _ = currentResponder.perform(selector, with: url)
        finish()
        return
      }

      responder = currentResponder.next
    }

    finish()
  }

  @MainActor
  private func finish() {
    extensionContext?.completeRequest(returningItems: nil)
  }
}

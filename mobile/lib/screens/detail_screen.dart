import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart' as launcher;

/// Product detail: full info + link to the store.
class DetailScreen extends StatelessWidget {
  final Map<String, dynamic> item;
  const DetailScreen({super.key, required this.item});

  @override
  Widget build(BuildContext context) {
    final price = item['priceText'] ?? (item['price'] != null ? 'Rs ${item['price']}' : 'Price unavailable');
    return Scaffold(
      appBar: AppBar(title: const Text('Details')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          AspectRatio(
            aspectRatio: 1,
            child: Image.network(
              item['image'] as String,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => const Icon(Icons.image_not_supported, size: 64),
            ),
          ),
          const SizedBox(height: 12),
          Text(item['title'] as String, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          Text(price, style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: () async {
              final url = Uri.parse(item['url'] as String);
              await launcher.launchUrl(url, mode: launcher.LaunchMode.externalApplication);
            },
            icon: const Icon(Icons.open_in_new),
            label: const Text('Open in store'),
          ),
        ],
      ),
    );
  }
}

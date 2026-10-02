import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../services/api.dart';
import 'results_screen.dart';

/// Home: photo upload (camera + gallery) and text search.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _text = TextEditingController();
  final _picker = ImagePicker();
  bool _busy = false;
  String? _error;

  Future<void> _pick(ImageSource source) async {
    setState(() { _busy = true; _error = null; });
    try {
      final f = await _picker.pickImage(source: source, maxWidth: 1024, imageQuality: 85);
      if (f == null) { setState(() => _busy = false); return; }
      final bytes = await f.readAsBytes();
      final b64 = base64Encode(bytes);
      if (!mounted) return;
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ResultsScreen.photo(photoBytes: bytes, photoBase64: b64),
        ),
      );
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _searchText() {
    final q = _text.text.trim();
    if (q.isEmpty) return;
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => ResultsScreen.text(query: q)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('ShopSense')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: _text,
              decoration: const InputDecoration(
                hintText: 'Search — "kala joota", "sasta smartwatch"…',
                prefixIcon: Icon(Icons.search),
                border: OutlineInputBorder(),
              ),
              onSubmitted: (_) => _searchText(),
            ),
            const SizedBox(height: 8),
            ElevatedButton(onPressed: _searchText, child: const Text('Search')),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _busy ? null : () => _pick(ImageSource.camera),
              icon: const Icon(Icons.camera_alt),
              label: const Text('Take photo'),
            ),
            const SizedBox(height: 8),
            ElevatedButton.icon(
              onPressed: _busy ? null : () => _pick(ImageSource.gallery),
              icon: const Icon(Icons.photo_library),
              label: const Text('Choose from gallery'),
            ),
            if (_busy) const Padding(
              padding: EdgeInsets.only(top: 16),
              child: Center(child: CircularProgressIndicator()),
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 16),
                child: Text(_error!, style: const TextStyle(color: Colors.red)),
              ),
            const Spacer(),
            const Text(
              'Prototype: results come from public store search at low volume; every result links to the store.',
              style: TextStyle(fontSize: 12, color: Colors.grey),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Saved items (local until the account backend is public).
class SavedScreen extends StatefulWidget {
  const SavedScreen({super.key});
  @override
  State<SavedScreen> createState() => _SavedScreenState();
}

class _SavedScreenState extends State<SavedScreen> {
  List<Map<String, dynamic>> _items = const [];

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    final p = await SharedPreferences.getInstance();
    final raw = p.getString('saved_items');
    if (raw != null && mounted) {
      setState(() => _items = (jsonDecode(raw) as List).cast<Map<String, dynamic>>());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Saved items')),
      body: _items.isEmpty
          ? const Center(child: Text('Nothing saved yet.'))
          : ListView.builder(
              itemCount: _items.length,
              itemBuilder: (_, i) => ListTile(
                title: Text(_items[i]['title'] as String? ?? ''),
                subtitle: Text(_items[i]['priceText'] as String? ?? ''),
              ),
            ),
    );
  }
}

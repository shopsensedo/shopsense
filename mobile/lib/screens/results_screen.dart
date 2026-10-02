import 'package:flutter/material.dart';
import '../services/api.dart';
import 'detail_screen.dart';

/// Results with source-status line; product detail on tap.
class ResultsScreen extends StatefulWidget {
  final List<int>? photoBytes;
  final String? photoBase64;
  final String? query;
  const ResultsScreen.photo({super.key, required this.photoBytes, required this.photoBase64})
      : query = null;
  const ResultsScreen.text({super.key, required this.query})
      : photoBytes = null, photoBase64 = null;

  @override
  State<ResultsScreen> createState() => _ResultsScreenState();
}

class _ResultsScreenState extends State<ResultsScreen> {
  bool _loading = true;
  String? _error;
  List<dynamic> _results = const [];
  String _sourceLine = '';

  @override
  void initState() {
    super.initState();
    _run();
  }

  Future<void> _run() async {
    try {
      if (widget.query != null) {
        final d = await ApiClient.liveSearch(widget.query!);
        _apply(d);
      } else {
        // Prefer the server-side re-rank endpoint (R11); fall back to
        // describe-image → live-search when the FastAPI backend is not set.
        try {
          final d = await ApiClient.searchImage(widget.photoBytes!);
          setState(() {
            _results = d['results'] as List? ?? const [];
            _sourceLine = 'Ranked server-side (CLIP re-rank).';
            _loading = false;
          });
          return;
        } catch (_) {
          final desc = await ApiClient.describeImage(widget.photoBase64!);
          final queries = (desc['queries'] as List).cast<String>();
          final d = await ApiClient.liveSearch(queries.first);
          _apply(d, note: 'via describe-image (${desc['category']})');
        }
      }
    } on DescribeUnavailable {
      setState(() { _error = 'Photo description is unavailable right now.'; _loading = false; });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  void _apply(Map<String, dynamic> d, {String note = ''}) {
    final src = d['sources'] as Map<String, dynamic>? ?? {};
    final disabled = d['liveSourcesEnabled'] == false;
    setState(() {
      _results = d['results'] as List? ?? const [];
      _sourceLine = disabled
          ? 'Live sources are disabled by the site setting — no store was contacted.'
          : 'PriceOye: ${src['priceoye']} · Daraz: ${src['daraz']} · Telemart: ${src['telemart']}$note';
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.query ?? 'Photo results')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!))
              : Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(8),
                      child: Text(_sourceLine, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                    ),
                    Expanded(
                      child: ListView.builder(
                        itemCount: _results.length,
                        itemBuilder: (_, i) {
                          final r = _results[i] as Map<String, dynamic>;
                          final price = r['priceText'] ?? (r['price'] != null ? 'Rs ${r['price']}' : 'Price unavailable');
                          return ListTile(
                            leading: Image.network(
                              ApiClient.thumbUrl(r['image'] as String),
                              width: 56, height: 56, fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => const Icon(Icons.image_not_supported),
                            ),
                            title: Text(r['title'] as String, maxLines: 2, overflow: TextOverflow.ellipsis),
                            subtitle: Text(price),
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => DetailScreen(item: r)),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
    );
  }
}

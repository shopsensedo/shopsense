import 'dart:convert';
import 'package:http/http.dart' as http;

/// API client for the ShopSense Vercel backend + FastAPI re-rank endpoint.
/// Shapes follow docs/openapi.yaml.
class ApiClient {
  static const vercelBase = 'https://shopsense-teal.vercel.app';
  // R11: set to your public FastAPI URL once deployed (human-gated).
  static const fastApiBase = String.fromEnvironment('FASTAPI_BASE', defaultValue: '');

  static Future<Map<String, dynamic>> liveSearch(String q, {String? skip}) async {
    final uri = Uri.parse('$vercelBase/api/live-search').replace(queryParameters: {
      'q': q,
      if (skip != null) 'skip': skip,
    });
    final r = await http.get(uri).timeout(const Duration(seconds: 15));
    if (r.statusCode != 200) throw Exception('live-search ${r.statusCode}');
    return jsonDecode(r.body) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> describeImage(String base64Image) async {
    final r = await http
        .post(
          Uri.parse('$vercelBase/api/describe-image'),
          headers: {'content-type': 'application/json'},
          body: jsonEncode({'image': base64Image, 'mimeType': 'image/jpeg'}),
        )
        .timeout(const Duration(seconds: 20));
    if (r.statusCode == 503) throw const DescribeUnavailable();
    if (r.statusCode != 200) throw Exception('describe-image ${r.statusCode}');
    return jsonDecode(r.body) as Map<String, dynamic>;
  }

  /// R11: server-side photo re-rank (the phone cannot run CLIP).
  static Future<Map<String, dynamic>> searchImage(List<int> jpegBytes) async {
    if (fastApiBase.isEmpty) throw Exception('FASTAPI_BASE not configured');
    final req = http.MultipartRequest('POST', Uri.parse('$fastApiBase/search/image'))
      ..files.add(http.MultipartFile.fromBytes('photo', jpegBytes, filename: 'photo.jpg'));
    final r = await http.Response.fromStream(await req.send().timeout(const Duration(seconds: 60)));
    if (r.statusCode != 200) throw Exception('/search/image ${r.statusCode}');
    return jsonDecode(r.body) as Map<String, dynamic>;
  }

  static String thumbUrl(String imageUrl) =>
      '$vercelBase/api/img?url=${Uri.encodeComponent(imageUrl)}';
}

class DescribeUnavailable implements Exception {
  const DescribeUnavailable();
  @override
  String toString() => 'describe-image unavailable (no API key on server)';
}

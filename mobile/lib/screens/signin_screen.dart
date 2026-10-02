import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// Sign-in against the account backend (FastAPI; local-only until public hosting is approved).
class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});
  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _email = TextEditingController();
  final _pass = TextEditingController();
  String? _error;
  bool _busy = false;

  // Backend base URL — local dev default; overridden with --dart-define=API_BASE=…
  static const apiBase = String.fromEnvironment('API_BASE', defaultValue: 'http://10.0.2.2:8000');

  Future<void> _login() async {
    setState(() { _busy = true; _error = null; });
    try {
      final r = await http.post(
        Uri.parse('$apiBase/auth/login'),
        headers: {'content-type': 'application/json'},
        body: jsonEncode({'email': _email.text.trim(), 'password': _pass.text}),
      ).timeout(const Duration(seconds: 15));
      if (r.statusCode != 200) throw Exception('Login failed (${r.statusCode})');
      final token = (jsonDecode(r.body) as Map)['access_token'] as String;
      final p = await SharedPreferences.getInstance();
      await p.setString('auth_token', token);
      await p.setString('auth_email', _email.text.trim());
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Sign in')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(controller: _email, decoration: const InputDecoration(labelText: 'Email')),
            TextField(controller: _pass, decoration: const InputDecoration(labelText: 'Password'), obscureText: true),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: _busy ? null : _login, child: const Text('Sign in')),
            if (_error != null)
              Padding(padding: const EdgeInsets.only(top: 12),
                child: Text(_error!, style: const TextStyle(color: Colors.red))),
            const Spacer(),
            const Text('The account backend runs locally for now — public hosting is pending approval.',
              style: TextStyle(fontSize: 12, color: Colors.grey), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

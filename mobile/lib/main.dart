import 'package:flutter/material.dart';
import 'theme.dart';
import 'screens/home_screen.dart';
import 'screens/saved_screen.dart';
import 'screens/signin_screen.dart';

void main() => runApp(const ShopSenseApp());

class ShopSenseApp extends StatefulWidget {
  const ShopSenseApp({super.key});
  @override
  State<ShopSenseApp> createState() => _ShopSenseAppState();
}

class _ShopSenseAppState extends State<ShopSenseApp> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ShopSense',
      theme: AppTheme.light,
      home: Scaffold(
        body: IndexedStack(
          index: _tab,
          children: const [HomeScreen(), SavedScreen(), SignInScreen()],
        ),
        bottomNavigationBar: BottomNavigationBar(
          currentIndex: _tab,
          onTap: (i) => setState(() => _tab = i),
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.search), label: 'Search'),
            BottomNavigationBarItem(icon: Icon(Icons.bookmark), label: 'Saved'),
            BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Account'),
          ],
        ),
      ),
    );
  }
}

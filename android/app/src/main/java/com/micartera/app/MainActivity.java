package com.micartera.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MiCarteraPlugin.class);       // antes de super.onCreate (así lo pide Capacitor)
        registerPlugin(TradeRepublicPlugin.class);   // puente TR (beta)
        super.onCreate(savedInstanceState);
    }
}

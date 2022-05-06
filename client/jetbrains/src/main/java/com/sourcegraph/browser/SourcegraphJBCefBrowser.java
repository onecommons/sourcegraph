package com.sourcegraph.browser;

import com.intellij.openapi.util.Disposer;
import com.intellij.ui.jcef.JBCefBrowser;
import com.sourcegraph.config.ThemeUtil;
import org.cef.CefApp;

import javax.swing.*;

public class SourcegraphJBCefBrowser extends JBCefBrowser {
    private final JSToJavaBridge jsToJavaBridge;

    public SourcegraphJBCefBrowser() {
        super("http://sourcegraph/html/index.html");
        // Create and set up JCEF browser
        CefApp.getInstance().registerSchemeHandlerFactory("http", "sourcegraph", new HttpSchemeHandlerFactory());
        this.setPageBackgroundColor(ThemeUtil.getPanelBackgroundColorHexString());

        // Create bridges, set up handlers, then run init function
        String initJSCode = "window.initializeSourcegraph(" + (ThemeUtil.isDarkTheme() ? "true" : "false") + ");";
        jsToJavaBridge = new JSToJavaBridge(this, new JSToJavaBridgeRequestHandler(), initJSCode);
        Disposer.register(this, jsToJavaBridge);
        JavaToJSBridge javaToJSBridge = new JavaToJSBridge(this);

        UIManager.addPropertyChangeListener(propertyChangeEvent -> {
            if (propertyChangeEvent.getPropertyName().equals("lookAndFeel")) {
                System.out.println("Look and feel changed");
                javaToJSBridge.callJS("themeChanged", "green");
            }
        });
    }

    public JSToJavaBridge getJsToJavaBridge() {
        return jsToJavaBridge;
    }

    public void focus() {
        this.getCefBrowser().setFocus(true);
    }
}

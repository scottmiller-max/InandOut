import React, { useState, useRef } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Text, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { X, Send } from 'lucide-react-native';

interface RileyChatModalProps {
  visible: boolean;
  onClose: () => void;
  userRole?: 'customer' | 'admin' | 'family_partner';
  contextData?: {
    userId?: string;
    moveId?: string;
    jobId?: string;
    fobData?: any;
    checklistData?: any;
  };
}

export const RileyChatModal: React.FC<RileyChatModalProps> = ({
  visible,
  onClose,
  userRole = 'customer',
  contextData
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [messages, setMessages] = useState<Array<{text: string, isUser: boolean}>>([
    { text: "Hi! I'm Riley, your IN&OUT Moving AI assistant. How can I help you today?", isUser: false }
  ]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const webViewRef = useRef<any>(null);
  const timeoutRef = useRef<any>(null);

  const getAssistantConfig = () => {
    // Role-based permissions and context
    const baseConfig = {
      assistantId: "c15d3af6-b9f1-43d1-970b-7ac1d6210a4d",
      publicKey: "b59b1f70-a71d-41cd-8d4e-d647571030f1",
    };

    // Add context data for Riley's query scope
    const contextString = JSON.stringify({
      userRole,
      ...contextData,
      timestamp: new Date().toISOString(),
    });

    return {
      ...baseConfig,
      context: contextString,
    };
  };

  const config = getAssistantConfig();

  const rileyHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>Riley AI Assistant</title>
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #f8fafc;
          overflow: hidden;
        }
        .riley-container {
          height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .riley-widget-container {
          flex: 1;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
        }
        vapi-widget {
          width: 100% !important;
          height: 100% !important;
          max-width: 100% !important;
          max-height: 100% !important;
        }
        .loading-indicator {
          text-align: center;
          padding: 20px;
          color: #64748b;
          font-size: 16px;
        }
        .debug-log {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(0,0,0,0.8);
          color: #00ff00;
          padding: 10px;
          font-size: 12px;
          font-family: monospace;
          max-height: 150px;
          overflow-y: auto;
          display: none;
        }
      </style>
    </head>
    <body>
      <div class="riley-container">
        <div class="riley-widget-container" id="widget-container">
          <div class="loading-indicator" id="loading">Initializing Riley AI...</div>
          <vapi-widget
            id="vapi-widget"
            assistant-id="${config.assistantId}"
            public-key="${config.publicKey}"
            data-context='${config.context}'
            style="display: none;">
          </vapi-widget>
        </div>
      </div>
      <div class="debug-log" id="debug"></div>

      <script>
        const debug = document.getElementById('debug');
        const loading = document.getElementById('loading');
        let logs = [];

        function log(msg) {
          const timestamp = new Date().toLocaleTimeString();
          const logMsg = timestamp + ': ' + msg;
          logs.push(logMsg);
          console.log(logMsg);
          if (debug) {
            debug.textContent = logs.slice(-10).join('\\n');
          }
          window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'LOG', message: logMsg }));
        }

        log('Starting Riley initialization');

        let scriptLoaded = false;
        let widgetInitialized = false;
        let loadAttempts = 0;

        function updateLoadingText(text) {
          if (loading) loading.textContent = text;
        }

        function showWidget() {
          log('Attempting to show widget');
          const container = document.getElementById('widget-container');
          const widget = document.getElementById('vapi-widget');

          if (loading) loading.style.display = 'none';
          if (widget) {
            log('Widget found, displaying');
            widget.style.display = 'block';
            widgetInitialized = true;
            window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'LOADED' }));
          } else {
            log('ERROR: Widget element not found');
            setTimeout(useFallback, 1000);
          }
        }

        function useFallback() {
          log('Switching to fallback mode');
          window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'USE_FALLBACK' }));
        }

        // Load Vapi script
        updateLoadingText('Loading Vapi script...');
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@vapi-ai/web@latest/dist/index.umd.js';
        script.type = 'text/javascript';
        script.crossOrigin = 'anonymous';

        script.onload = function() {
          scriptLoaded = true;
          log('Vapi script loaded successfully');
          updateLoadingText('Initializing widget...');

          // Wait for custom element to be defined
          if (customElements && customElements.whenDefined) {
            customElements.whenDefined('vapi-widget').then(() => {
              log('vapi-widget custom element defined');
              setTimeout(showWidget, 1000);
            }).catch(err => {
              log('ERROR defining custom element: ' + err);
              useFallback();
            });
          } else {
            setTimeout(showWidget, 2000);
          }
        };

        script.onerror = function(e) {
          log('ERROR loading Vapi script: ' + e);
          updateLoadingText('Failed to load. Switching to fallback mode...');
          setTimeout(useFallback, 1000);
        };

        log('Appending script to document');
        document.head.appendChild(script);

        // Ultimate fallback timeout - 8 seconds
        setTimeout(function() {
          if (!widgetInitialized) {
            log('Timeout reached, using fallback');
            useFallback();
          }
        }, 8000);

        // Listen for widget custom events
        window.addEventListener('vapi-widget-ready', function() {
          log('vapi-widget-ready event received');
          showWidget();
        });
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'LOG') {
        console.log('[Riley WebView]:', data.message);
      } else if (data.type === 'LOADED') {
        setIsLoading(false);
        setLoadError(false);
        setUseFallback(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      } else if (data.type === 'USE_FALLBACK') {
        console.log('Switching to fallback chat interface');
        setIsLoading(false);
        setUseFallback(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      } else if (data.type === 'ERROR') {
        setIsLoading(false);
        setLoadError(true);
        console.error('Riley loading error:', data.message);
      }
    } catch (error) {
      console.error('Riley WebView message error:', error);
    }
  };

  const handleWebViewError = () => {
    console.log('WebView error, switching to fallback');
    setIsLoading(false);
    setUseFallback(true);
  };

  const sendMessage = () => {
    if (!inputText.trim() || isSending) return;

    const userMessage = inputText.trim();
    setMessages(prev => [...prev, { text: userMessage, isUser: true }]);
    setInputText('');
    setIsSending(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "I'm here to help with your move! What would you like to know?",
        "I can assist with booking, tracking, and answering questions about your move.",
        "For specific details about your move, please contact our team directly. How else can I help?",
        "That's a great question! Let me help you with that."
      ];
      const response = responses[Math.floor(Math.random() * responses.length)];
      setMessages(prev => [...prev, { text: response, isUser: false }]);
      setIsSending(false);
    }, 1000);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Riley AI Assistant</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
        
        {useFallback ? (
          <View style={styles.fallbackContainer}>
            <ScrollView style={styles.messagesContainer} contentContainerStyle={styles.messagesContent}>
              {messages.map((msg, idx) => (
                <View key={idx} style={[styles.messageBubble, msg.isUser ? styles.userBubble : styles.aiBubble]}>
                  <Text style={[styles.messageText, msg.isUser ? styles.userText : styles.aiText]}>
                    {msg.text}
                  </Text>
                </View>
              ))}
              {isSending && (
                <View style={[styles.messageBubble, styles.aiBubble]}>
                  <ActivityIndicator size="small" color="#2563eb" />
                </View>
              )}
            </ScrollView>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type your message..."
                multiline
                maxLength={500}
                onSubmitEditing={sendMessage}
              />
              <TouchableOpacity
                style={[styles.sendButton, (!inputText.trim() || isSending) && styles.sendButtonDisabled]}
                onPress={sendMessage}
                disabled={!inputText.trim() || isSending}
              >
                <Send size={20} color={inputText.trim() && !isSending ? "#ffffff" : "#94a3b8"} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>Loading Riley AI...</Text>
                <Text style={styles.loadingSubtext}>This may take a few seconds</Text>
              </View>
            )}

            <WebView
              ref={webViewRef}
              source={{ html: rileyHTML }}
              originWhitelist={["*"]}
              style={[styles.webview, isLoading && { opacity: 0 }]}
              onMessage={handleMessage}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={false}
              onError={handleWebViewError}
              onHttpError={handleWebViewError}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              mixedContentMode="always"
              cacheEnabled={false}
              incognito={true}
            />
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc' 
  },
  header: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webview: { 
    flex: 1 
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 250, 252, 0.9)',
    zIndex: 1000,
  },
  loadingText: {
    fontSize: 16,
    color: '#2563eb',
    marginTop: 16,
    fontFamily: 'Inter-Regular',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    fontFamily: 'Inter-Regular',
  },
  fallbackContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563eb',
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: '#ffffff',
    fontFamily: 'Inter-Regular',
  },
  aiText: {
    color: '#1e293b',
    fontFamily: 'Inter-Regular',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#e2e8f0',
  },
});
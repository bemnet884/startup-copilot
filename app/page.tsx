"use client";
import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Star, Zap, TrendingUp, Mic, MicOff, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { api } from "@/convex/_generated/api";
import { saveResearch } from "@/lib/convex";

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ keywords?: string; summary?: string }>({});
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Initialize voice recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setQuery(prev => prev + transcript);
          setIsListening(false);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult({});

    try {
      // Call your research API
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed: ${res.status}`);
      }

      const data = await res.json();
      setResult(data);

      // 🔹 Save to Convex
      await saveResearch({
        idea: query,
        keywords: data.keywords || "",
        summary: data.summary || "",
      });
      console.log("Saved to Convex DB!");

      // ✅ Clear input after success
      setQuery("");
    } catch (err: any) {
      console.error("Error:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 md:p-8">
      {/* Header */}
      <div className="w-full max-w-4xl mb-8 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Startup Copilot</h1>
          </div>

          <div className="flex gap-2">
            <Badge variant="outline" className="bg-white text-gray-700 border-gray-300">
              <TrendingUp className="mr-1 h-3 w-3 text-blue-500" /> 58.5K Users
            </Badge>
            <Badge variant="outline" className="bg-white text-gray-700 border-gray-300">
              <Star className="mr-1 h-3 w-3 text-amber-500" /> 2 Months Free
            </Badge>
          </div>
        </div>
        <p className="mt-4 text-gray-600">
          Analyze markets, competitors, and discover opportunities to validate your startup ideas.
        </p>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-4xl flex-1 flex flex-col">
        {/* Results Area - Similar to ChatGPT conversation */}
        <div className="flex-1 mb-6 overflow-auto">
          {(!result.keywords && !result.summary) && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="p-3 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full mb-4">
                <Zap className="h-8 w-8 text-purple-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Startup Research Assistant</h2>
              <p className="text-gray-500 max-w-md">
                Enter a market research query or use the microphone to speak your question.
              </p>
            </div>
          )}

          {result.summary && (
            <Card className="mb-4 border-0 bg-white shadow-md">
              <CardContent className="p-6">
                <div className="text-gray-700 leading-relaxed prose prose-sm max-w-none">
                  <ReactMarkdown>{result.summary}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}

          {result.keywords && (
            <Card className="border-0 bg-white shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-amber-100 rounded-md">
                    <span className="text-amber-600">🔑</span>
                  </div>
                  <h3 className="font-semibold text-gray-800">Keywords</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.keywords.split(', ').map((keyword, index) => (
                    <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <Card className="mt-4 bg-red-50 border-red-200">
              <CardContent className="p-4">
                <p className="font-semibold text-red-700">Error</p>
                <p className="text-red-600">{error}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Input Area - ChatGPT Style */}
        <div className="sticky bottom-0 bg-gray-50 pt-4 pb-2">
          <Card className="bg-white border-gray-300 shadow-lg">
            <CardContent className="p-2">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    type="text"
                    className="w-full pl-4 pr-12 py-5 border-0 focus-visible:ring-0 text-gray-800 placeholder:text-gray-500"
                    placeholder="Enter your market research query..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 rounded-full ${isListening ? 'bg-red-100 text-red-600' : 'text-gray-500'}`}
                      onClick={isListening ? stopListening : startListening}
                    >
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button
                  className="py-5 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all font-semibold disabled:opacity-50"
                  type="submit"
                  disabled={loading || !query.trim()}
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-gray-400 text-xs mt-2">
            Powered by advanced AI research technology
          </p>
        </div>
      </div>
    </div>
  );
}
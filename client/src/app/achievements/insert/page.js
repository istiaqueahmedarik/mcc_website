"use client";
import React, { useCallback, useRef, useState } from "react";
import {
  Menu,
  X,
  ImageIcon,
  TrophyIcon,
  CalendarIcon,
  Check,
  Copy,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import EditorWrapper from "@/components/EditorWrapper";
// Fix the Tooltip import - use the correct import structure
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const CNESSidebar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);

  const handleCopy = useCallback(() => {
    if (inputRef.current?.value) {
      navigator.clipboard.writeText(inputRef.current.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, []);

  return (
    <>
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-blue-600 text-white rounded-md shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div
        style={{ background: "var(--sidebar-background)" }}
        className={`fixed 
          lg:relative inset-y-0 left-0 z-50 
          w-80 sm:w-96 lg:w-80 
          border-r border-gray-200 dark:border-zinc-700 
          transform transition-transform duration-300 ease-in-out ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 h-[90vh] overflow-y-auto`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-zinc-700 relative">
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden absolute top-4 right-4 p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>

          <div className="flex items-center space-x-3 pr-8 lg:pr-0">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-blue-600 truncate">
                Create Achievement
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-300 break-words">
                Share the latest achievements of MIST Computer Club
              </p>
            </div>
          </div>
        </div>

        <div className="w-full flex flex-col px-4 mt-4">
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <div className="relative">
                <TrophyIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  id="title"
                  name="title"
                  placeholder="Title of the achievement"
                  className="pl-10 border-gray-300 dark:border-zinc-700 dark:focus:ring-zinc-600"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">Image</Label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="file"
                  id="image"
                  name="image"
                  className="pl-10 border-gray-300 dark:border-zinc-700"
                  accept="image/*"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Uploaded Image URL</Label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  id="imageUrl"
                  ref={inputRef}
                  name="imageUrl"
                  disabled
                  placeholder="Image Url of the achievement"
                  className="pl-10 pr-12 border-gray-300 dark:border-zinc-700 dark:focus:ring-zinc-600"
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={handleCopy}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="rounded-md bg-gray-900 px-2 py-1 text-xs text-white"
                    >
                      {copied ? "Copied!" : "Copy to clipboard"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="date" id="date" name="date" className="pl-10" />
              </div>
            </div>

            {/* {state?.message && (
              <Alert variant={state?.success ? "default" : "destructive"}>
                <AlertDescription>{state?.message}</AlertDescription>
              </Alert>
            )} */}
          </form>
        </div>
      </div>
    </>
  );
};

const MainContent = () => {
  const [inputValue, setInputValue] = useState("");
  const [description, setDescription] = useState("");

  const handleDescriptionChange = useCallback((newValue) => {
    setDescription((prev) => newValue);
  }, []);

  return (
    <div className="flex-1 h-screen lg:ml-0 ml-0">
      <div className="h-full flex flex-col">
        <div className="flex-1 flex flex-col">
          <div>
            <EditorWrapper
              value={description}
              handleChange={handleDescriptionChange}
            />
            <input type="hidden" name="description" value={description} />
          </div>
          <div className="mt-4 flex justify-between items-center px-4">
            <span className="text-sm text-gray-500">
              {description.length} characters
            </span>
            <button className="px-6 py-2 bg-zinc-700 dark:bg-zinc-200 text-white rounded-lg dark:text-zinc-800 transition-colors">
              Create Achievement
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const NHEFPage = () => {
  return (
    <div className="w-full flex justify-center">
      <div className="flex w-full">
        <CNESSidebar />
        <MainContent />
      </div>
    </div>
  );
};

export default NHEFPage;

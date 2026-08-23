"use client";

import { Check, Copy, Download, FileUp, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useTeams } from "@/hooks/use-teams";
import { detectGenerationFromShowdown } from "@/lib/team-export";
import type { Generation } from "@/types/team";
import { GENERATION_INFO, GENERATIONS_LIST } from "@/types/team";

interface TeamImportExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "import" | "export";
  teamId?: string; // For single team export
}

export function TeamImportExportDialog({
  open,
  onOpenChange,
  mode,
  teamId,
}: TeamImportExportDialogProps) {
  const {
    teams,
    getTeam,
    importTeamsJSON,
    importTeamShowdown,
    exportTeamShowdown,
    downloadAllTeams,
    downloadTeam,
    copyTeamShowdown,
  } = useTeams();

  const [importTab, setImportTab] = useState<"showdown" | "json">("showdown");
  const [importText, setImportText] = useState("");
  const [teamName, setTeamName] = useState("Imported Team");
  const [selectedGeneration, setSelectedGeneration] = useState<
    Generation | "auto"
  >("auto");
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const team = teamId ? getTeam(teamId) : null;

  const handleImportShowdown = () => {
    if (!importText.trim()) {
      setImportResult({ success: false, message: "Please paste team data" });
      return;
    }

    const gen =
      selectedGeneration === "auto"
        ? detectGenerationFromShowdown(importText) || "national-dex"
        : selectedGeneration;

    const { team: newTeam, errors } = importTeamShowdown(
      importText,
      teamName || "Imported Team",
      gen,
    );

    if (newTeam) {
      const genInfo = GENERATION_INFO[gen];
      setImportResult({
        success: true,
        message: `Imported ${newTeam.members.length} Pokemon to "${newTeam.name}" (${genInfo.name})${errors.length > 0 ? `\n\nWarnings:\n${errors.join("\n")}` : ""}`,
      });
      setImportText("");
      setTeamName("Imported Team");
    } else {
      setImportResult({
        success: false,
        message: `Import failed:\n${errors.join("\n")}`,
      });
    }
  };

  const handleImportJSON = () => {
    if (!importText.trim()) {
      setImportResult({
        success: false,
        message: "Please paste or upload JSON data",
      });
      return;
    }

    const { imported, errors } = importTeamsJSON(importText);

    if (imported > 0) {
      setImportResult({
        success: true,
        message: `Imported ${imported} team${imported > 1 ? "s" : ""}${errors.length > 0 ? `\n\nWarnings:\n${errors.join("\n")}` : ""}`,
      });
      setImportText("");
    } else {
      setImportResult({
        success: false,
        message: `Import failed:\n${errors.join("\n")}`,
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportText(content);
    };
    reader.readAsText(file);

    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleCopyShowdown = async () => {
    if (!teamId) return;
    const success = await copyTeamShowdown(teamId);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (teamId) {
      downloadTeam(teamId);
    } else {
      downloadAllTeams();
    }
  };

  const handleClose = () => {
    setImportResult(null);
    setImportText("");
    onOpenChange(false);
  };

  const showdownPreview = team && teamId ? exportTeamShowdown(teamId) : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "import" ? "import team" : "export team"}
          </DialogTitle>
          <DialogDescription>
            {mode === "import"
              ? "Import a team using Pokemon Showdown format or JSON"
              : team
                ? `Export "${team.name}" to share with others`
                : "Export all your teams"}
          </DialogDescription>
        </DialogHeader>

        {mode === "import" ? (
          <Tabs
            value={importTab}
            onValueChange={(v) => {
              setImportTab(v as "showdown" | "json");
              setImportResult(null);
            }}
          >
            <TabsList className="w-full">
              <TabsTrigger value="showdown" className="flex-1">
                Showdown
              </TabsTrigger>
              <TabsTrigger value="json" className="flex-1">
                JSON
              </TabsTrigger>
            </TabsList>

            <TabsContent value="showdown" className="space-y-4 mt-4">
              <div className="space-y-2">
                <label htmlFor="team-name" className="text-sm font-medium">
                  Team Name
                </label>
                <Input
                  id="team-name"
                  placeholder="My Imported Team"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="generation-select"
                  className="text-sm font-medium"
                >
                  Generation
                </label>
                <Select
                  value={selectedGeneration}
                  onValueChange={(v) =>
                    setSelectedGeneration(v as Generation | "auto")
                  }
                >
                  <SelectTrigger id="generation-select" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-detect</SelectItem>
                    {GENERATIONS_LIST.map((gen) => {
                      const info = GENERATION_INFO[gen];
                      return (
                        <SelectItem key={gen} value={gen}>
                          {info.name} - {info.label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="showdown-paste" className="text-sm font-medium">
                  Paste Showdown Format
                </label>
                <Textarea
                  id="showdown-paste"
                  placeholder={`Pikachu @ Light Ball
Ability: Static
- Thunderbolt
- Volt Switch

Charizard @ Heavy-Duty Boots
Ability: Blaze
- Flamethrower
- Air Slash`}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="min-h-[150px] font-mono text-xs"
                />
              </div>

              {importResult && (
                <div
                  className={`p-3 rounded-md text-sm whitespace-pre-wrap ${
                    importResult.success
                      ? "bg-green-500/10 text-green-600 dark:text-green-400"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {importResult.message}
                </div>
              )}
            </TabsContent>

            <TabsContent value="json" className="space-y-4 mt-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                >
                  <FileUp className="size-4 mr-1" />
                  Upload JSON File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="json-paste" className="text-sm font-medium">
                  Or Paste JSON
                </label>
                <Textarea
                  id="json-paste"
                  placeholder='{"teams": [...]}'
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="min-h-[150px] font-mono text-xs"
                />
              </div>

              {importResult && (
                <div
                  className={`p-3 rounded-md text-sm whitespace-pre-wrap ${
                    importResult.success
                      ? "bg-green-500/10 text-green-600 dark:text-green-400"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {importResult.message}
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4">
            {team && showdownPreview && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Showdown Format</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyShowdown}
                    className="h-7 px-2"
                  >
                    {copied ? (
                      <>
                        <Check className="size-3 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="size-3 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <div className="bg-muted p-3 rounded-md font-mono text-xs whitespace-pre-wrap">
                  {showdownPreview || "No Pokemon in team"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Paste this into Pokemon Showdown, PokePaste, or any tool that
                  accepts Showdown format
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={handleDownload}>
                <Download className="size-4 mr-2" />
                {team ? "Download Team as JSON" : "Download All Teams as JSON"}
              </Button>
              {!team && teams.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  {teams.length} team{teams.length !== 1 ? "s" : ""} will be
                  exported
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {mode === "import" ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={
                  importTab === "showdown"
                    ? handleImportShowdown
                    : handleImportJSON
                }
                disabled={!importText.trim()}
              >
                <Upload className="size-4 mr-1" />
                Import
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={handleClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface QuickImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickImportDialog({
  open,
  onOpenChange,
}: QuickImportDialogProps) {
  return (
    <TeamImportExportDialog
      open={open}
      onOpenChange={onOpenChange}
      mode="import"
    />
  );
}

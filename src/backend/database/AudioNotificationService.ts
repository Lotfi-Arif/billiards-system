import playSound from "play-sound";
import { ExecException } from "child_process";
import Logger from "@/shared/logger";
import { BusinessError } from "@/shared/types/errors";

/**
 * AudioNotificationService handles playing audio notifications
 * (for example, a prayer reminder or a prayer start notification).
 */
export class AudioNotificationService {
  private player: ReturnType<typeof playSound>;
  private reminderAudioPath: string;
  private prayerStartAudioPath: string;

  /**
   * Constructs an instance of AudioNotificationService.
   *
   * @param reminderAudioPath - Path to the audio file used for prayer reminders (e.g., 10 minutes before prayer).
   * @param prayerStartAudioPath - Path to the audio file used at prayer start.
   */
  constructor(reminderAudioPath: string, prayerStartAudioPath: string) {
    // Create a new player instance with default options.
    this.player = playSound();
    this.reminderAudioPath = reminderAudioPath;
    this.prayerStartAudioPath = prayerStartAudioPath;
    Logger.info(
      `AudioNotificationService initialized with reminder audio: ${reminderAudioPath} and prayer start audio: ${prayerStartAudioPath}`
    );
  }

  /**
   * Plays an audio file from the given file path.
   *
   * @param filePath - The path to the audio file.
   * @returns A Promise that resolves when the audio starts playing.
   * @throws BusinessError if playing the audio fails.
   */
  playAudio(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      Logger.info(`Attempting to play audio file: ${filePath}`);
      // The player.play method accepts a callback that receives an error (if any)
      this.player.play(filePath, (err: ExecException | null) => {
        if (err) {
          Logger.error(`Error playing audio file ${filePath}: ${err.message}`);
          return reject(
            new BusinessError(`Failed to play audio file: ${err.message}`)
          );
        }
        Logger.info(`Audio file played successfully: ${filePath}`);
        resolve();
      });
    });
  }

  /**
   * Plays the prayer reminder audio (e.g., 10 minutes before prayer time).
   *
   * @returns A Promise that resolves when the audio starts playing.
   */
  playPrayerReminder(): Promise<void> {
    Logger.info("Playing prayer reminder audio");
    return this.playAudio(this.reminderAudioPath);
  }

  /**
   * Plays the prayer start notification audio (at prayer time).
   *
   * @returns A Promise that resolves when the audio starts playing.
   */
  playPrayerStartNotification(): Promise<void> {
    Logger.info("Playing prayer start notification audio");
    return this.playAudio(this.prayerStartAudioPath);
  }
}

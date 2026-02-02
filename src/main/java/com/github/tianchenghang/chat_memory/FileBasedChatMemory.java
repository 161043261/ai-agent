package com.github.tianchenghang.chat_memory;

import com.esotericsoftware.kryo.Kryo;
import com.esotericsoftware.kryo.io.Input;
import com.esotericsoftware.kryo.io.Output;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import org.objenesis.strategy.StdInstantiatorStrategy;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.Message;

/** File-based persistent chat memory implementation. */
public class FileBasedChatMemory implements ChatMemory {

  private final String BASE_DIR;
  private static final Kryo kryo = new Kryo();

  static {
    kryo.setRegistrationRequired(false);
    // Set instantiation strategy
    kryo.setInstantiatorStrategy(new StdInstantiatorStrategy());
  }

  // Constructor: specify the directory for file storage
  public FileBasedChatMemory(String dir) {
    this.BASE_DIR = dir;
    var baseDir = new File(dir);
    if (!baseDir.exists()) {
      baseDir.mkdirs();
    }
  }

  @Override
  public void add(String conversationId, List<Message> messages) {
    var conversationMessages = getOrCreateConversation(conversationId);
    conversationMessages.addAll(messages);
    saveConversation(conversationId, conversationMessages);
  }

  @Override
  public List<Message> get(String conversationId) {
    return getOrCreateConversation(conversationId);
  }

  @Override
  public void clear(String conversationId) {
    var file = getConversationFile(conversationId);
    if (file.exists()) {
      file.delete();
    }
  }

  private List<Message> getOrCreateConversation(String conversationId) {
    var file = getConversationFile(conversationId);
    var messages = new ArrayList<Message>();
    if (file.exists()) {
      try (Input input = new Input(new FileInputStream(file))) {
        messages = kryo.readObject(input, ArrayList.class);
      } catch (IOException e) {
        e.printStackTrace();
      }
    }
    return messages;
  }

  private void saveConversation(String conversationId, List<Message> messages) {
    var file = getConversationFile(conversationId);
    try (var output = new Output(new FileOutputStream(file))) {
      kryo.writeObject(output, messages);
    } catch (IOException e) {
      e.printStackTrace();
    }
  }

  private File getConversationFile(String conversationId) {
    return new File(BASE_DIR, conversationId + ".kryo");
  }
}

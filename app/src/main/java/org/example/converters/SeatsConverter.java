package org.example.converters;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.List;

@Converter
public class SeatsConverter implements AttributeConverter<List<List<Integer>>, String> {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(List<List<Integer>> seats) {
        try {
            return MAPPER.writeValueAsString(seats);
        } catch (Exception e) {
            throw new RuntimeException("Failed to convert seats to JSON", e);
        }
    }

    @Override
    public List<List<Integer>> convertToEntityAttribute(String json) {
        try {
            return MAPPER.readValue(json, new TypeReference<List<List<Integer>>>() {});
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse seats JSON", e);
        }
    }
}

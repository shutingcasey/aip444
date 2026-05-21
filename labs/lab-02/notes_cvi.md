# CVI620 - Session 3 Notes

## Overview

* Digital images
* Image formats
* ROI
* Slicing and cropping
* Padding
* Color conversion

---

# 1. Digital Images

In Computer Vision:

```python
Image = NumPy Array
```

OpenCV uses BGR instead of RGB.

---

# 2. Reading Images

```python
image = cv2.imread('Lucy.jpg')
```

Reads an image into a NumPy array.

---

# 3. Showing Images

```python
cv2.imshow('cat', image)
cv2.waitKey(0)
cv2.destroyAllWindows()
```

| Function            | Purpose            |
| ------------------- | ------------------ |
| imshow()            | Display image      |
| waitKey(0)          | Wait for key press |
| destroyAllWindows() | Close windows      |

---

# 4. Saving Images

```python
cv2.imwrite('new.jpg', image)
```

---

# 5. Image Shape

```python
print(image.shape)
```

Returns:

```python
(height, width, channels)
```

---

# 6. Image Formats

## JPG

* Lossy compression
* Small file size
* Good for photos

## PNG

* Lossless compression
* Supports transparency
* Good for graphics

## TIFF

* High quality
* Large file size
* Used in professional imaging

---

# 7. Copy vs Assignment

```python
img2 = img1
```

Both variables point to the same memory.

Correct method:

```python
img_copy = img.copy()
```

---

# 8. ROI (Region of Interest)

ROI = Selected area of an image.

Benefits:

* Faster processing
* Focus on important region

---

# 9. Slicing

```python
roi = image[50:200, 100:300]
```

Format:

```python
image[y1:y2, x1:x2]
```

---

# 10. Cropping

```python
cropped = img[411:1560, 1700:3000]
```

Cropping is slicing.

---

# 11. Split and Merge Channels

Split:

```python
b, g, r = cv2.split(image)
```

Merge:

```python
merged = cv2.merge([b, g, r])
```

---

# 12. Padding

Padding adds borders around an image.

```python
cv2.copyMakeBorder()
```

Common border types:

* BORDER_CONSTANT
* BORDER_REFLECT
* BORDER_REPLICATE

---

# 13. Color Conversion

```python
cv2.cvtColor(image, code)
```

Examples:

```python
cv2.COLOR_BGR2GRAY
cv2.COLOR_BGR2RGB
cv2.COLOR_BGR2HSV
```

---

# 14. Important Exam Concepts

* OpenCV uses BGR
* Image = NumPy Array
* `img2 = img1` is NOT a deep copy
* ROI format is `image[y1:y2, x1:x2]`
* `shape` returns `(height, width, channels)`
